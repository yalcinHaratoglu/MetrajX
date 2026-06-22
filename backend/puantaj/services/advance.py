from decimal import Decimal

from django.db.models import Sum

from ..models import AdvancePayment


def total_available_advance(subcontractor_id: int, site_id: int) -> Decimal:
    total = AdvancePayment.objects.filter(
        subcontractor_id=subcontractor_id,
        site_id=site_id,
        remaining_balance__gt=0,
    ).aggregate(s=Sum("remaining_balance"))["s"]
    return total or Decimal("0")


def consume_advance_balance(subcontractor_id: int, site_id: int, amount: Decimal) -> Decimal:
    """FIFO mahsup; kalan talep edilen tutarı döner."""
    remaining_to_deduct = amount
    advances = AdvancePayment.objects.filter(
        subcontractor_id=subcontractor_id,
        site_id=site_id,
        remaining_balance__gt=0,
    ).order_by("payment_date", "id")

    for adv in advances:
        if remaining_to_deduct <= 0:
            break
        take = min(adv.remaining_balance, remaining_to_deduct)
        adv.remaining_balance -= take
        adv.save(update_fields=["remaining_balance", "updated_at"])
        remaining_to_deduct -= take

    return amount - remaining_to_deduct
