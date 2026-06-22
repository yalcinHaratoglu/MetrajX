from django.utils import timezone

from daily_log.models import DailyLog
from metraj.models import MetrajOperation
from puantaj.models import Timesheet
from site_calendar.models import CalendarEvent
from finans.models import MaterialMovement


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
            unit = op.item.unit or ""
            if qty:
                op_parts.append(f"{op.item.description}: {qty} {unit}".strip())
            else:
                op_parts.append(op.item.description)
        lines.append("Tamamlanan metraj: " + "; ".join(op_parts))

    worker_count = Timesheet.objects.filter(site=site, date=log_date).count()
    if worker_count:
        lines.append(f"Puantaj: {worker_count} işçi kaydı")

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


def get_or_create_daily_log(site, user, log_date=None) -> DailyLog:
    if log_date is None:
        log_date = timezone.localdate()

    existing = DailyLog.objects.filter(site=site, log_date=log_date).first()
    if existing:
        return existing

    summary = _build_auto_summary(site, log_date)
    worker_count = Timesheet.objects.filter(site=site, date=log_date).count()

    return DailyLog.objects.create(
        site=site,
        log_date=log_date,
        summary=summary,
        worker_count=worker_count,
        created_by=user,
    )
