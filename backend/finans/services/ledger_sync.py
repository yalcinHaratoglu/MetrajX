from decimal import Decimal

from django.db import transaction

from finans.models import LedgerAccount, LedgerEntry, Vendor


def ensure_default_accounts(company) -> LedgerAccount:
    account, _ = LedgerAccount.objects.get_or_create(
        company=company,
        code="320",
        defaults={
            "name": "Taşeron Borçları",
            "account_type": LedgerAccount.AccountType.PAYABLE,
            "is_system": True,
        },
    )
    return account


def get_or_create_vendor_for_subcontractor(subcontractor) -> Vendor:
    if hasattr(subcontractor, "vendor") and subcontractor.vendor:
        return subcontractor.vendor
    return Vendor.objects.create(
        company=subcontractor.site.company,
        subcontractor=subcontractor,
        name=subcontractor.name,
        contact_phone=subcontractor.contact_phone,
    )


@transaction.atomic
def sync_hakedis_period_to_ledger(period, user=None) -> LedgerEntry | None:
    """Onaylı hakediş dönemini cari kayda dönüştür."""
    existing = LedgerEntry.objects.filter(hakedis_period=period).first()
    if existing:
        return existing

    if period.net_payable <= Decimal("0"):
        return None

    company = period.site.company
    account = ensure_default_accounts(company)
    amount = period.approved_payable if period.approved_payable is not None else period.net_payable
    if amount <= Decimal("0"):
        return None

    entry = LedgerEntry.objects.create(
        site=period.site,
        account=account,
        direction=LedgerEntry.Direction.CREDIT,
        amount=amount,
        entry_date=period.period_end,
        description=f"Hakediş dönemi {period.period_start} – {period.period_end}",
        source_type=LedgerEntry.SourceType.HAKEDIS_PERIOD,
        hakedis_period=period,
        created_by=user,
    )
    return entry
