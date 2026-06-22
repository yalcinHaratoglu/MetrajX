from decimal import Decimal

from django.db.models import Count, Q, Sum

from metraj.models import MetrajItem

from ..models import Timesheet
from .hakedis import hakedis_for_site, metraj_item_earned


def timesheet_stats_for_site(site_id: int, year: int, month: int) -> dict:
    """Seçili ay için saha puantaj istatistikleri (para hesabına dahil değil)."""
    summary = Timesheet.objects.filter(
        site_id=site_id,
        date__year=year,
        date__month=month,
    ).aggregate(
        entry_count=Count("id"),
        worker_days=Sum(
            "worker_count",
            filter=Q(worker__isnull=True),
            default=0,
        ),
        named_worker_days=Count("id", filter=Q(worker__isnull=False)),
    )
    worker_days = (summary["worker_days"] or 0) + (summary["named_worker_days"] or 0)
    return {
        "entry_count": summary["entry_count"] or 0,
        "worker_days": worker_days,
    }


def settlement_for_site(site_id: int, year: int, month: int) -> dict:
    """
    Hakediş tutarları metraj ilerlemesinden; puantaj yalnızca işçi-gün istatistiği.
    """
    ts_stats = timesheet_stats_for_site(site_id, year, month)
    hakedis = hakedis_for_site(site_id)

    lines = []
    for row in hakedis["lines"]:
        sub_id = row["subcontractor_id"]
        month_worker_days = (
            Timesheet.objects.filter(
                site_id=site_id,
                subcontractor_id=sub_id,
                date__year=year,
                date__month=month,
            ).aggregate(
                legacy=Sum("worker_count", filter=Q(worker__isnull=True), default=0),
                named=Count("id", filter=Q(worker__isnull=False)),
            )
        )
        sub_days = (month_worker_days["legacy"] or 0) + (month_worker_days["named"] or 0)
        lines.append(
            {
                **row,
                "month_worker_days": sub_days,
            }
        )

    return {
        "year": year,
        "month": month,
        "entry_count": ts_stats["entry_count"],
        "worker_days": ts_stats["worker_days"],
        "grand_total": hakedis["earned_total"],
        "contract_total": hakedis["contract_total"],
        "lines": lines,
    }


def earned_total_for_subcontractor(subcontractor_id: int) -> Decimal:
    items = MetrajItem.objects.filter(subcontractor_id=subcontractor_id)
    return sum((metraj_item_earned(item) for item in items), Decimal("0"))
