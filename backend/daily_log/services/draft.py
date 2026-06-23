from decimal import Decimal

from django.utils import timezone

from daily_log.models import DailyLog
from finans.models import MaterialMovement
from metraj.models import MetrajOperation
from puantaj.models import Timesheet, Worker
from site_calendar.models import CalendarEvent

THIN_SPACE = "\u202f"


def _format_quantity_tr(qty) -> str:
    """TR okunabilir miktar: 30 (30.000 değil), 30,5, 30 000 (ince boşluk)."""
    d = Decimal(str(qty)).normalize()
    if d == d.to_integral_value():
        n = int(d)
        if abs(n) >= 10_000:
            return f"{n:,}".replace(",", THIN_SPACE)
        return str(n)
    s = format(d, "f").rstrip("0").rstrip(".")
    if "." in s:
        int_part, frac_part = s.split(".", 1)
        int_n = int(int_part) if int_part else 0
        if abs(int_n) >= 10_000:
            int_formatted = f"{int_n:,}".replace(",", THIN_SPACE)
        else:
            int_formatted = int_part or "0"
        return f"{int_formatted},{frac_part}"
    return s


def _format_unit(unit: str) -> str:
    mapping = {"m3": "m³", "m2": "m²"}
    key = (unit or "").strip().lower()
    return mapping.get(key, unit or "")


def _subcontractors_with_metraj_progress(site, log_date) -> set[int]:
    return set(
        MetrajOperation.objects.filter(
            item__site=site,
            scheduled_date=log_date,
            status=MetrajOperation.Status.DONE,
        )
        .exclude(item__subcontractor_id=None)
        .values_list("item__subcontractor_id", flat=True)
    )


def _build_attendance_summary(site, log_date) -> tuple[list[str], int]:
    subs_with_progress = _subcontractors_with_metraj_progress(site, log_date)

    timesheets = Timesheet.objects.filter(
        site=site,
        date=log_date,
        worker__isnull=False,
    ).select_related("worker", "worker__subcontractor", "worker__site", "subcontractor")

    groups: dict[str, set[int]] = {}
    for ts in timesheets:
        worker = ts.worker
        if subs_with_progress:
            sub_id = worker.subcontractor_id or ts.subcontractor_id
            if sub_id not in subs_with_progress:
                continue
        if worker.employment_type == Worker.EmploymentType.DIRECT:
            label = worker.site.name if worker.site_id else "Firma"
        elif worker.subcontractor_id:
            label = worker.subcontractor.name
        elif ts.subcontractor_id:
            label = ts.subcontractor.name
        else:
            label = "—"
        groups.setdefault(label, set()).add(worker.id)

    lines = [f"{label} - {len(ids)} kişi" for label, ids in sorted(groups.items())]
    total = sum(len(ids) for ids in groups.values())
    return lines, total


def _build_auto_summary(site, log_date) -> str:
    lines: list[str] = []

    done_ops = (
        MetrajOperation.objects.filter(
            item__site=site,
            scheduled_date=log_date,
            status=MetrajOperation.Status.DONE,
        )
        .select_related("item")
        .order_by("item__description")
    )
    if done_ops.exists():
        op_parts = []
        for op in done_ops:
            qty = op.quantity_done or 0
            unit = _format_unit(op.item.unit or "")
            if qty:
                op_parts.append(f"{op.item.description}: {_format_quantity_tr(qty)} {unit}".strip())
            else:
                op_parts.append(op.item.description)
        lines.append("Tamamlanan metraj: " + "; ".join(op_parts))

    attendance_lines, _ = _build_attendance_summary(site, log_date)
    if attendance_lines:
        lines.append("Puantaj: " + "; ".join(attendance_lines))

    stock_in = MaterialMovement.objects.filter(
        item__site=site,
        movement_type=MaterialMovement.MovementType.IN,
        movement_date=log_date,
    ).count()
    if stock_in:
        lines.append(f"Stok girişi: {stock_in} hareket")

    events = CalendarEvent.objects.filter(site=site, event_date=log_date)
    if events.exists():
        event_parts = [e.title for e in events]
        lines.append("Olaylar: " + ", ".join(event_parts))

    if not lines:
        return "[Otomatik] Bugün için kayıt bulunamadı."
    return "[Otomatik]\n" + "\n".join(lines)


def build_daily_log_suggestions(site, log_date) -> dict:
    attendance_lines, worker_count = _build_attendance_summary(site, log_date)
    return {
        "summary": _build_auto_summary(site, log_date),
        "worker_count": worker_count,
        "attendance_lines": attendance_lines,
    }


def get_or_create_daily_log(site, user, log_date=None) -> DailyLog:
    if log_date is None:
        log_date = timezone.localdate()

    existing = DailyLog.objects.filter(site=site, log_date=log_date).first()
    if existing:
        return existing

    suggestions = build_daily_log_suggestions(site, log_date)

    return DailyLog.objects.create(
        site=site,
        log_date=log_date,
        summary=suggestions["summary"],
        worker_count=suggestions["worker_count"],
        created_by=user,
    )
