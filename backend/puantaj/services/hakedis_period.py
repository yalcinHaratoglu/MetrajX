from decimal import Decimal

from django.db import transaction
from django.db.models import Sum
from django.utils import timezone

from metraj.models import MetrajItem

from ..models import (
    AdvancePayment,
    HakedisPeriod,
    HakedisPeriodLine,
    HakedisPeriodSubcontractorDeduction,
    SubcontractorContract,
)


def _prev_cumulative_percent(metraj_item_id: int, site_id: int, before_period_id: int | None) -> int:
    """Son onaylı dönemdeki kümülatif %; yoksa 0."""
    qs = HakedisPeriodLine.objects.filter(
        metraj_item_id=metraj_item_id,
        period__site_id=site_id,
        period__status__in=(
            HakedisPeriod.Status.APPROVED,
            HakedisPeriod.Status.PAID,
        ),
    ).select_related("period")
    if before_period_id:
        qs = qs.exclude(period_id=before_period_id).filter(
            period__period_end__lt=HakedisPeriod.objects.filter(pk=before_period_id)
            .values("period_end")[:1]
        )
    line = qs.order_by("-period__period_end", "-period__id").first()
    return line.current_cumulative_percent if line else 0


def get_prev_cumulative_for_item(metraj_item_id: int, site_id: int) -> int:
    line = (
        HakedisPeriodLine.objects.filter(
            metraj_item_id=metraj_item_id,
            period__site_id=site_id,
            period__status__in=(
                HakedisPeriod.Status.APPROVED,
                HakedisPeriod.Status.PAID,
            ),
        )
        .order_by("-period__period_end", "-period__id")
        .first()
    )
    return line.current_cumulative_percent if line else 0


def _active_contract(subcontractor_id: int) -> SubcontractorContract | None:
    return (
        SubcontractorContract.objects.filter(
            subcontractor_id=subcontractor_id,
            status=SubcontractorContract.Status.ACTIVE,
        )
        .order_by("-created_at")
        .first()
    )


def recalculate_period_totals(period: HakedisPeriod, *, allow_locked: bool = False) -> HakedisPeriod:
    if period.is_locked and not allow_locked:
        raise ValueError("Kilitli dönem yeniden hesaplanamaz.")
    total_gross = sum(
        (ln.line_gross for ln in period.lines.all()),
        Decimal("0"),
    )
    deductions = period.subcontractor_deductions.all()
    total_retainage = sum((d.retainage_amount for d in deductions), Decimal("0"))
    total_advance = sum((d.advance_deduction for d in deductions), Decimal("0"))
    total_other = sum((d.other_deductions for d in deductions), Decimal("0"))
    period.total_gross = total_gross
    period.total_retainage = total_retainage
    period.total_advance_deduction = total_advance
    period.total_other_deductions = total_other
    period.net_payable = total_gross - total_retainage - total_advance - total_other
    period.save(
        update_fields=[
            "total_gross",
            "total_retainage",
            "total_advance_deduction",
            "total_other_deductions",
            "net_payable",
            "updated_at",
        ]
    )
    return period


def calculate_period_lines(period: HakedisPeriod) -> HakedisPeriod:
    if period.is_locked:
        raise ValueError("Kilitli dönem yeniden hesaplanamaz.")

    other_map = {
        d.subcontractor_id: d.other_deductions
        for d in period.subcontractor_deductions.all()
    }
    notes_map = {d.subcontractor_id: d.notes for d in period.subcontractor_deductions.all()}

    items = MetrajItem.objects.filter(
        site_id=period.site_id,
        subcontractor__isnull=False,
    ).select_related("subcontractor", "category")

    period.lines.all().delete()
    period.subcontractor_deductions.all().delete()

    sub_gross: dict[int, Decimal] = {}

    for item in items:
        prev_pct = get_prev_cumulative_for_item(item.id, period.site_id)
        current_pct = item.completion_percent
        delta_pct = max(0, current_pct - prev_pct)
        unit_price = item.unit_price or Decimal("0")
        line_gross = item.quantity * Decimal(delta_pct) / Decimal("100") * unit_price

        HakedisPeriodLine.objects.create(
            period=period,
            metraj_item=item,
            subcontractor=item.subcontractor,
            quantity=item.quantity,
            unit_price=item.unit_price,
            prev_cumulative_percent=prev_pct,
            current_cumulative_percent=current_pct,
            delta_percent=delta_pct,
            line_gross=line_gross,
        )
        sub_gross[item.subcontractor_id] = sub_gross.get(item.subcontractor_id, Decimal("0")) + line_gross

    total_gross = sum(sub_gross.values(), Decimal("0"))
    total_retainage = Decimal("0")
    total_advance = Decimal("0")
    total_other = Decimal("0")

    for sub_id, gross in sub_gross.items():
        contract = _active_contract(sub_id)
        retainage_pct = contract.retainage_percent if contract else Decimal("0")
        retainage_amt = (gross * retainage_pct / Decimal("100")).quantize(Decimal("0.01"))
        advance_amt = apply_advance_deduction_preview(sub_id, period.site_id, gross - retainage_amt)
        other_amt = other_map.get(sub_id, Decimal("0"))

        HakedisPeriodSubcontractorDeduction.objects.create(
            period=period,
            subcontractor_id=sub_id,
            retainage_amount=retainage_amt,
            advance_deduction=advance_amt,
            other_deductions=other_amt,
            notes=notes_map.get(sub_id, ""),
        )
        total_retainage += retainage_amt
        total_advance += advance_amt
        total_other += other_amt

    period.total_gross = total_gross
    period.total_retainage = total_retainage
    period.total_advance_deduction = total_advance
    period.total_other_deductions = total_other
    period.net_payable = total_gross - total_retainage - total_advance - total_other
    period.save(
        update_fields=[
            "total_gross",
            "total_retainage",
            "total_advance_deduction",
            "total_other_deductions",
            "net_payable",
            "updated_at",
        ]
    )
    return period


def apply_advance_deduction_preview(
    subcontractor_id: int,
    site_id: int,
    available: Decimal,
) -> Decimal:
    """Onay öncesi önizleme — bakiyeyi değiştirmez."""
    from .advance import total_available_advance

    available_advance = total_available_advance(subcontractor_id, site_id)
    return min(available, available_advance)


@transaction.atomic
def submit_period(period: HakedisPeriod, user) -> HakedisPeriod:
    if period.status != HakedisPeriod.Status.DRAFT:
        raise ValueError("Yalnızca taslak dönem gönderilebilir.")
    calculate_period_lines(period)
    period.status = HakedisPeriod.Status.PENDING_APPROVAL
    period.submitted_at = timezone.now()
    if not period.prepared_by_id:
        period.prepared_by = user
    period.save(update_fields=["status", "submitted_at", "prepared_by", "updated_at"])
    return period


@transaction.atomic
def approve_period(period: HakedisPeriod, user) -> HakedisPeriod:
    if period.status != HakedisPeriod.Status.PENDING_APPROVAL:
        raise ValueError("Yalnızca onay bekleyen dönem onaylanabilir.")

    calculate_period_lines(period)

    for deduction in period.subcontractor_deductions.select_related("subcontractor"):
        if deduction.advance_deduction > 0:
            from .advance import consume_advance_balance

            consume_advance_balance(
                deduction.subcontractor_id,
                period.site_id,
                deduction.advance_deduction,
            )

    now = timezone.now()
    period.status = HakedisPeriod.Status.APPROVED
    period.approved_by = user
    period.approved_at = now
    period.locked_at = now
    period.save(
        update_fields=[
            "status",
            "approved_by",
            "approved_at",
            "locked_at",
            "updated_at",
        ]
    )

    from finans.services.ledger_sync import sync_hakedis_period_to_ledger

    sync_hakedis_period_to_ledger(period, user)

    return period


def _revert_approval_side_effects(period: HakedisPeriod) -> None:
    for deduction in period.subcontractor_deductions.all():
        if deduction.advance_deduction > 0:
            from .advance import restore_advance_balance

            restore_advance_balance(
                deduction.subcontractor_id,
                period.site_id,
                deduction.advance_deduction,
            )

    from finans.services.ledger_sync import clear_hakedis_period_from_ledger

    clear_hakedis_period_from_ledger(period)


@transaction.atomic
def delete_hakedis_period(period: HakedisPeriod) -> None:
    if period.status == HakedisPeriod.Status.PAID:
        raise ValueError("Ödenmiş dönem silinemez.")
    if period.is_locked:
        _revert_approval_side_effects(period)
    period.delete()


@transaction.atomic
def update_locked_period(period: HakedisPeriod, user, **fields) -> HakedisPeriod:
    if period.status == HakedisPeriod.Status.PAID:
        raise ValueError("Ödenmiş dönem düzenlenemez.")
    if not period.is_locked:
        raise ValueError("Yalnızca onaylı dönemler bu yolla güncellenir.")

    for key, value in fields.items():
        setattr(period, key, value)
    period.save()

    from finans.services.ledger_sync import resync_hakedis_period_to_ledger

    resync_hakedis_period_to_ledger(period, user)
    return period


def period_to_dict(period: HakedisPeriod) -> dict:
    lines = list(
        period.lines.select_related("metraj_item", "subcontractor", "metraj_item__category").all()
    )
    deductions = {
        d.subcontractor_id: d for d in period.subcontractor_deductions.select_related("subcontractor").all()
    }

    line_payload = []
    for ln in lines:
        line_payload.append(
            {
                "id": ln.id,
                "metraj_item_id": ln.metraj_item_id,
                "description": ln.metraj_item.description,
                "category_name": ln.metraj_item.category.name,
                "subcontractor_id": ln.subcontractor_id,
                "subcontractor_name": ln.subcontractor.name,
                "quantity": ln.quantity,
                "unit_price": ln.unit_price,
                "prev_cumulative_percent": ln.prev_cumulative_percent,
                "current_cumulative_percent": ln.current_cumulative_percent,
                "delta_percent": ln.delta_percent,
                "line_gross": ln.line_gross,
            }
        )

    sub_summaries = []
    sub_ids = {ln.subcontractor_id for ln in lines}
    for sub_id in sorted(sub_ids):
        sub_lines = [ln for ln in lines if ln.subcontractor_id == sub_id]
        gross = sum((ln.line_gross for ln in sub_lines), Decimal("0"))
        ded = deductions.get(sub_id)
        sub_summaries.append(
            {
                "subcontractor_id": sub_id,
                "subcontractor_name": sub_lines[0].subcontractor.name,
                "gross_total": gross,
                "retainage_amount": ded.retainage_amount if ded else Decimal("0"),
                "advance_deduction": ded.advance_deduction if ded else Decimal("0"),
                "other_deductions": ded.other_deductions if ded else Decimal("0"),
                "net_total": gross
                - (ded.retainage_amount if ded else Decimal("0"))
                - (ded.advance_deduction if ded else Decimal("0"))
                - (ded.other_deductions if ded else Decimal("0")),
            }
        )

    return {
        "id": period.id,
        "site_id": period.site_id,
        "period_start": period.period_start,
        "period_end": period.period_end,
        "status": period.status,
        "prepared_by": period.prepared_by_id,
        "submitted_at": period.submitted_at,
        "approved_by": period.approved_by_id,
        "approved_at": period.approved_at,
        "locked_at": period.locked_at,
        "total_gross": period.total_gross,
        "total_retainage": period.total_retainage,
        "total_advance_deduction": period.total_advance_deduction,
        "total_other_deductions": period.total_other_deductions,
        "net_payable": period.net_payable,
        "approved_payable": period.approved_payable,
        "notes": period.notes,
        "lines": line_payload,
        "subcontractor_summaries": sub_summaries,
    }
