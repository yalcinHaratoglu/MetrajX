from decimal import Decimal

from django.db import transaction
from django.db.models import Sum

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


def _subcontractor_net_amounts(period) -> dict[int, Decimal]:
    """Taşeron bazında net hakediş tutarları."""
    from puantaj.models import HakedisPeriodSubcontractorDeduction

    gross_by_sub: dict[int, Decimal] = {}
    for line in period.lines.select_related("subcontractor").all():
        gross_by_sub[line.subcontractor_id] = (
            gross_by_sub.get(line.subcontractor_id, Decimal("0")) + line.line_gross
        )

    deductions = {
        d.subcontractor_id: d
        for d in period.subcontractor_deductions.select_related("subcontractor").all()
    }

    nets: dict[int, Decimal] = {}
    for sub_id, gross in gross_by_sub.items():
        ded = deductions.get(sub_id)
        retainage = ded.retainage_amount if ded else Decimal("0")
        advance = ded.advance_deduction if ded else Decimal("0")
        other = ded.other_deductions if ded else Decimal("0")
        net = gross - retainage - advance - other
        if net > 0:
            nets[sub_id] = net

    if period.approved_payable is not None and nets:
        calculated_total = sum(nets.values(), Decimal("0"))
        if calculated_total > 0 and period.approved_payable != calculated_total:
            ratio = period.approved_payable / calculated_total
            nets = {sub_id: (amount * ratio).quantize(Decimal("0.01")) for sub_id, amount in nets.items()}

    return nets


@transaction.atomic
def sync_hakedis_period_to_ledger(period, user=None) -> list[LedgerEntry]:
    """Onaylı hakediş dönemini taşeron bazlı cari kayıtlara dönüştür."""
    existing = list(
        LedgerEntry.objects.filter(hakedis_period=period).select_related("vendor")
    )
    if existing:
        return existing

    nets = _subcontractor_net_amounts(period)
    if not nets and period.net_payable > Decimal("0"):
        amount = period.approved_payable if period.approved_payable is not None else period.net_payable
        if amount > 0:
            nets = {0: amount}

    if not nets:
        return []

    company = period.site.company
    account = ensure_default_accounts(company)
    created: list[LedgerEntry] = []

    from puantaj.models import Subcontractor

    for sub_id, amount in nets.items():
        if amount <= Decimal("0"):
            continue
        vendor = None
        sub_name = ""
        if sub_id:
            sub = Subcontractor.objects.get(pk=sub_id)
            vendor = get_or_create_vendor_for_subcontractor(sub)
            sub_name = sub.name

        desc = f"Hakediş — {sub_name} ({period.period_start} – {period.period_end})" if sub_name else (
            f"Hakediş dönemi {period.period_start} – {period.period_end}"
        )
        entry = LedgerEntry.objects.create(
            site=period.site,
            account=account,
            vendor=vendor,
            direction=LedgerEntry.Direction.CREDIT,
            amount=amount,
            entry_date=period.period_end,
            description=desc,
            source_type=LedgerEntry.SourceType.HAKEDIS_PERIOD,
            hakedis_period=period,
            created_by=user,
        )
        created.append(entry)

    return created


def clear_hakedis_period_from_ledger(period) -> int:
    deleted, _ = LedgerEntry.objects.filter(hakedis_period=period).delete()
    return deleted


@transaction.atomic
def resync_hakedis_period_to_ledger(period, user=None) -> list[LedgerEntry]:
    clear_hakedis_period_from_ledger(period)
    return sync_hakedis_period_to_ledger(period, user)
