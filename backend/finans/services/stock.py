from decimal import Decimal

from django.db import transaction

from finans.models import LedgerAccount, LedgerEntry, MaterialMovement, MaterialStockItem
from finans.services.ledger_sync import ensure_default_accounts


@transaction.atomic
def apply_material_movement(item: MaterialStockItem, movement: MaterialMovement) -> MaterialStockItem:
    delta = movement.quantity if movement.movement_type == MaterialMovement.MovementType.IN else -movement.quantity
    item.quantity_on_hand = (item.quantity_on_hand or Decimal("0")) + delta
    if item.quantity_on_hand < 0:
        raise ValueError("Stok yetersiz.")
    item.save(update_fields=["quantity_on_hand", "updated_at"])
    return item


@transaction.atomic
def record_payment(site, amount: Decimal, user, *, vendor=None, description="", entry_date=None):
    from django.utils import timezone

    account = ensure_default_accounts(site.company)
    bank, _ = LedgerAccount.objects.get_or_create(
        company=site.company,
        code="102",
        defaults={
            "name": "Banka",
            "account_type": LedgerAccount.AccountType.BANK,
            "is_system": True,
        },
    )
    entry = LedgerEntry.objects.create(
        site=site,
        account=account,
        vendor=vendor,
        direction=LedgerEntry.Direction.DEBIT,
        amount=amount,
        entry_date=entry_date or timezone.localdate(),
        description=description or "Taşeron ödemesi",
        source_type=LedgerEntry.SourceType.PAYMENT,
        created_by=user,
    )
    return entry
