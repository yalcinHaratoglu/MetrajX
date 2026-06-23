from decimal import Decimal

from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient

from authentication.models import Company
from finans.models import LedgerEntry
from metraj.models import MetrajCategory, MetrajItem
from puantaj.models import (
    HakedisPeriod,
    HakedisPeriodLine,
    HakedisPeriodSubcontractorDeduction,
    Subcontractor,
)
from sites.models import Site

User = get_user_model()


class FinansAPITestCase(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.company = Company.objects.create(name="Test İnşaat")
        self.owner = User.objects.create_user(
            email="owner@conmanage.com",
            password="TestPass123!",
            company=self.company,
            role=User.Role.OWNER,
            is_active=True,
        )
        self.manager = User.objects.create_user(
            email="manager@conmanage.com",
            password="TestPass123!",
            company=self.company,
            role=User.Role.SITE_MANAGER,
            is_active=True,
        )
        self.site = Site.objects.create(
            company=self.company,
            created_by=self.owner,
            name="A Blok",
            code="A",
        )

    def test_site_manager_cannot_access_ledger(self):
        self.client.force_authenticate(user=self.manager)
        response = self.client.get(f"/api/finans/ledger/?site_id={self.site.id}")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_ledger_summary_empty(self):
        self.client.force_authenticate(user=self.owner)
        response = self.client.get(f"/api/finans/summary/?site_id={self.site.id}")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["entry_count"], 0)
        self.assertEqual(Decimal(response.data["balance"]), Decimal("0"))

    def test_ledger_list_after_hakedis_and_payment(self):
        from finans.services.ledger_sync import sync_hakedis_period_to_ledger

        period = HakedisPeriod.objects.create(
            site=self.site,
            period_start="2026-06-01",
            period_end="2026-06-30",
            status=HakedisPeriod.Status.APPROVED,
            net_payable=Decimal("15000.00"),
            approved_payable=Decimal("14000.00"),
            prepared_by=self.owner,
        )
        sync_hakedis_period_to_ledger(period, self.owner)

        self.client.force_authenticate(user=self.owner)
        pay_resp = self.client.post(
            "/api/finans/payments/",
            {
                "site_id": self.site.id,
                "amount": "5000.00",
                "description": "Taşeron ödemesi",
                "entry_date": "2026-06-15",
            },
            format="json",
        )
        self.assertEqual(pay_resp.status_code, status.HTTP_201_CREATED)

        ledger_resp = self.client.get(f"/api/finans/ledger/?site_id={self.site.id}")
        self.assertEqual(ledger_resp.status_code, status.HTTP_200_OK)
        self.assertEqual(len(ledger_resp.data), 2)
        hakedis_rows = [r for r in ledger_resp.data if r["hakedis_period_id"]]
        payment_rows = [r for r in ledger_resp.data if r["hakedis_period_id"] is None]
        self.assertEqual(len(hakedis_rows), 1)
        self.assertEqual(len(payment_rows), 1)
        self.assertEqual(Decimal(hakedis_rows[0]["amount"]), Decimal("14000.00"))

    def test_hakedis_creates_per_subcontractor_ledger_rows(self):
        from finans.services.ledger_sync import sync_hakedis_period_to_ledger

        category = MetrajCategory.objects.create(
            company=self.company,
            slug="beton-a",
            name="Beton",
            default_unit="m3",
            is_custom=True,
        )
        sub_a = Subcontractor.objects.create(site=self.site, name="Taşeron A", category=category)
        sub_b = Subcontractor.objects.create(site=self.site, name="Taşeron B", category=category)
        item_a = MetrajItem.objects.create(
            site=self.site, category=category, description="İş A", subcontractor=sub_a
        )
        item_b = MetrajItem.objects.create(
            site=self.site, category=category, description="İş B", subcontractor=sub_b
        )
        period = HakedisPeriod.objects.create(
            site=self.site,
            period_start="2026-06-01",
            period_end="2026-06-30",
            status=HakedisPeriod.Status.APPROVED,
            net_payable=Decimal("30000.00"),
            prepared_by=self.owner,
        )
        HakedisPeriodLine.objects.create(
            period=period,
            metraj_item=item_a,
            subcontractor=sub_a,
            quantity=Decimal("1"),
            line_gross=Decimal("20000.00"),
        )
        HakedisPeriodLine.objects.create(
            period=period,
            metraj_item=item_b,
            subcontractor=sub_b,
            quantity=Decimal("1"),
            line_gross=Decimal("10000.00"),
        )
        HakedisPeriodSubcontractorDeduction.objects.create(
            period=period, subcontractor=sub_a, retainage_amount=Decimal("2000.00")
        )

        entries = sync_hakedis_period_to_ledger(period, self.owner)
        self.assertEqual(len(entries), 2)
        names = {e.vendor.name for e in entries if e.vendor}
        self.assertEqual(names, {"Taşeron A", "Taşeron B"})
        amounts = sorted(e.amount for e in entries)
        self.assertEqual(amounts, [Decimal("10000.00"), Decimal("18000.00")])

        self.client.force_authenticate(user=self.owner)
        ledger_resp = self.client.get(f"/api/finans/ledger/?site_id={self.site.id}")
        self.assertEqual(ledger_resp.status_code, status.HTTP_200_OK)
        hakedis_rows = [r for r in ledger_resp.data if r["hakedis_period_id"]]
        self.assertEqual(len(hakedis_rows), 2)
        vendor_names = {r["vendor_name"] for r in hakedis_rows}
        self.assertEqual(vendor_names, {"Taşeron A", "Taşeron B"})

    def test_vendor_balances_per_subcontractor(self):
        from finans.services.ledger_sync import get_or_create_vendor_for_subcontractor, sync_hakedis_period_to_ledger

        category = MetrajCategory.objects.create(
            company=self.company,
            slug="beton-b",
            name="Beton B",
            default_unit="m3",
            is_custom=True,
        )
        sub_a = Subcontractor.objects.create(site=self.site, name="Taşeron A", category=category)
        sub_b = Subcontractor.objects.create(site=self.site, name="Taşeron B", category=category)
        item_a = MetrajItem.objects.create(
            site=self.site, category=category, description="İş A", subcontractor=sub_a
        )
        item_b = MetrajItem.objects.create(
            site=self.site, category=category, description="İş B", subcontractor=sub_b
        )
        period = HakedisPeriod.objects.create(
            site=self.site,
            period_start="2026-06-01",
            period_end="2026-06-30",
            status=HakedisPeriod.Status.APPROVED,
            net_payable=Decimal("30000.00"),
            prepared_by=self.owner,
        )
        HakedisPeriodLine.objects.create(
            period=period,
            metraj_item=item_a,
            subcontractor=sub_a,
            quantity=Decimal("1"),
            line_gross=Decimal("20000.00"),
        )
        HakedisPeriodLine.objects.create(
            period=period,
            metraj_item=item_b,
            subcontractor=sub_b,
            quantity=Decimal("1"),
            line_gross=Decimal("10000.00"),
        )
        sync_hakedis_period_to_ledger(period, self.owner)
        vendor_a = get_or_create_vendor_for_subcontractor(sub_a)

        self.client.force_authenticate(user=self.owner)
        self.client.post(
            "/api/finans/payments/",
            {
                "site_id": self.site.id,
                "vendor_id": vendor_a.id,
                "amount": "5000.00",
                "description": "Kısmi ödeme",
                "entry_date": "2026-06-15",
            },
            format="json",
        )

        resp = self.client.get(f"/api/finans/vendor-balances/?site_id={self.site.id}")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(len(resp.data), 2)
        by_name = {r["vendor_name"]: r for r in resp.data}
        self.assertEqual(Decimal(by_name["Taşeron A"]["total_credit"]), Decimal("20000.00"))
        self.assertEqual(Decimal(by_name["Taşeron A"]["total_debit"]), Decimal("5000.00"))
        self.assertEqual(Decimal(by_name["Taşeron A"]["balance"]), Decimal("15000.00"))
        self.assertEqual(Decimal(by_name["Taşeron B"]["balance"]), Decimal("10000.00"))


class LedgerSyncTestCase(TestCase):
    def setUp(self):
        self.company = Company.objects.create(name="Test İnşaat")
        self.user = User.objects.create_user(
            email="owner@conmanage.com",
            password="TestPass123!",
            company=self.company,
            role=User.Role.OWNER,
            is_active=True,
        )
        self.site = Site.objects.create(
            company=self.company,
            created_by=self.user,
            name="A Blok",
            code="A",
        )

    def test_sync_hakedis_period_creates_ledger_entry(self):
        from finans.services.ledger_sync import sync_hakedis_period_to_ledger

        period = HakedisPeriod.objects.create(
            site=self.site,
            period_start="2026-06-01",
            period_end="2026-06-30",
            status=HakedisPeriod.Status.APPROVED,
            net_payable=Decimal("15000.00"),
            prepared_by=self.user,
        )
        entries = sync_hakedis_period_to_ledger(period, self.user)
        self.assertEqual(len(entries), 1)
        entry = entries[0]
        self.assertEqual(entry.amount, Decimal("15000.00"))
        self.assertEqual(entry.source_type, LedgerEntry.SourceType.HAKEDIS_PERIOD)
        self.assertEqual(LedgerEntry.objects.filter(hakedis_period=period).count(), 1)

        again = sync_hakedis_period_to_ledger(period, self.user)
        self.assertEqual(len(again), 1)
        self.assertEqual(again[0].id, entry.id)
