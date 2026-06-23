import io
from datetime import date, timedelta

from django.db.models import Q
from django.http import HttpResponse
from django.utils import timezone

from ..models import Timesheet, Worker
from .workers import workers_for_site_qs


def _date_range(date_from: date, date_to: date) -> list[date]:
    days: list[date] = []
    current = date_from
    while current <= date_to:
        days.append(current)
        current += timedelta(days=1)
    return days


def attendance_matrix(
    site_id: int,
    date_from: date,
    date_to: date,
    subcontractor_id: int | None = None,
    employment_type: str | None = None,
    search: str = "",
) -> dict:
    workers_qs = workers_for_site_qs(site_id)

    if employment_type in (Worker.EmploymentType.SUBCONTRACTOR, Worker.EmploymentType.DIRECT):
        workers_qs = workers_qs.filter(employment_type=employment_type)
    if subcontractor_id:
        workers_qs = workers_qs.filter(
            subcontractor_id=subcontractor_id,
            employment_type=Worker.EmploymentType.SUBCONTRACTOR,
        )
    if search.strip():
        q = search.strip()
        workers_qs = workers_qs.filter(
            Q(first_name__icontains=q)
            | Q(last_name__icontains=q)
            | Q(national_id__icontains=q)
        )

    dates = _date_range(date_from, date_to)
    date_keys = [d.isoformat() for d in dates]

    timesheets = Timesheet.objects.filter(
        site_id=site_id,
        worker_id__isnull=False,
        date__gte=date_from,
        date__lte=date_to,
    ).values_list("worker_id", "date")

    present_map: dict[int, set[str]] = {}
    for worker_id, ts_date in timesheets:
        present_map.setdefault(worker_id, set()).add(ts_date.isoformat())

    worker_rows = []
    for worker in workers_qs.order_by("employment_type", "last_name", "first_name"):
        days_set = present_map.get(worker.id, set())
        days_dict = {dk: dk in days_set for dk in date_keys}
        worker_rows.append(
            {
                "id": worker.id,
                "full_name": worker.full_name,
                "employment_type": worker.employment_type,
                "role": worker.role,
                "pay_type": worker.pay_type,
                "subcontractor_id": worker.subcontractor_id,
                "subcontractor_name": worker.employer_name,
                "days": days_dict,
                "total_days": len(days_set),
            }
        )

    return {
        "date_from": date_from.isoformat(),
        "date_to": date_to.isoformat(),
        "dates": date_keys,
        "workers": worker_rows,
    }


def toggle_attendance(site_id: int, worker_id: int, day: date, present: bool, user) -> None:
    worker = workers_for_site_qs(site_id, active_only=False).get(pk=worker_id)
    if day > timezone.localdate():
        raise ValueError("Gelecek tarih için puantaj girilemez.")

    existing = Timesheet.objects.filter(worker_id=worker_id, date=day).first()
    if present:
        if not existing:
            Timesheet.objects.create(
                site_id=site_id,
                subcontractor=worker.subcontractor,
                worker=worker,
                date=day,
                worker_count=1,
                created_by=user,
            )
    elif existing:
        existing.delete()


def export_attendance_xlsx(site_id: int, date_from: date, date_to: date, **filters) -> HttpResponse:
    from openpyxl import Workbook

    data = attendance_matrix(site_id, date_from, date_to, **filters)
    wb = Workbook()
    ws = wb.active
    ws.title = "Puantaj"
    ws.append(["İşçi", "İşveren", "Tür", *data["dates"], "Toplam Gün"])
    type_labels = {
        Worker.EmploymentType.SUBCONTRACTOR: "Taşeron",
        Worker.EmploymentType.DIRECT: "Firma",
    }
    for row in data["workers"]:
        ws.append(
            [
                row["full_name"],
                row["subcontractor_name"],
                type_labels.get(row["employment_type"], row["employment_type"]),
                *["1" if row["days"].get(d) else "" for d in data["dates"]],
                row["total_days"],
            ]
        )
    output = io.BytesIO()
    wb.save(output)
    output.seek(0)
    response = HttpResponse(
        output.getvalue(),
        content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    )
    response["Content-Disposition"] = (
        f'attachment; filename="puantaj_{date_from}_{date_to}.xlsx"'
    )
    return response
