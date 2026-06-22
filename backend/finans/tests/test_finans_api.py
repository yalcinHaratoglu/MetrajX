from decimal import Decimal

from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient

from authentication.models import Company
from finans.models import LedgerEntry
from puantaj.models import HakedisPeriod
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
        entry = sync_hakedis_period_to_ledger(period, self.user)
        self.assertIsNotNone(entry)
        self.assertEqual(entry.amount, Decimal("15000.00"))
        self.assertEqual(entry.source_type, LedgerEntry.SourceType.HAKEDIS_PERIOD)
        self.assertEqual(LedgerEntry.objects.filter(hakedis_period=period).count(), 1)

        again = sync_hakedis_period_to_ledger(period, self.user)
        self.assertEqual(again.id, entry.id)
