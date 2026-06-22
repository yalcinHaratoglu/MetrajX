from datetime import date
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient

from authentication.models import Company
from metraj.models import MetrajCategory, MetrajItem
from puantaj.models import (
    AdvancePayment,
    HakedisPeriod,
    Subcontractor,
    SubcontractorContract,
    Timesheet,
)
from sites.models import Site, SiteMembership

User = get_user_model()


class HakedisPeriodTestCase(TestCase):
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
        self.accountant = User.objects.create_user(
            email="accountant@conmanage.com",
            password="TestPass123!",
            company=self.company,
            role=User.Role.ACCOUNTANT,
            is_active=True,
        )
        self.site = Site.objects.create(
            company=self.company,
            created_by=self.owner,
            name="A Blok",
            code="A",
        )
        SiteMembership.objects.create(site=self.site, user=self.manager)
        self.category = MetrajCategory.objects.create(
            company=self.company,
            slug="beton",
            name="Beton",
            default_unit="m3",
            is_custom=True,
        )
        self.sub = Subcontractor.objects.create(
            site=self.site,
            name="Betoncu",
            category=self.category,
        )
        SubcontractorContract.objects.create(
            subcontractor=self.sub,
            retainage_percent=Decimal("10"),
            status=SubcontractorContract.Status.ACTIVE,
        )
        self.item = MetrajItem.objects.create(
            site=self.site,
            category=self.category,
            subcontractor=self.sub,
            description="Temel",
            unit="m3",
            quantity=Decimal("100"),
            unit_price=Decimal("1000"),
            completion_percent=50,
        )

    def _create_period(self, user=None):
        user = user or self.manager
        self.client.force_authenticate(user=user)
        return self.client.post(
            "/api/puantaj/hakedis-periods/",
            {
                "site_id": self.site.id,
                "period_start": "2026-06-01",
                "period_end": "2026-06-30",
            },
            format="json",
        )

    def test_hakedis_period_calculates_delta_not_cumulative(self):
        resp = self._create_period()
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        line = resp.data["lines"][0]
        self.assertEqual(line["prev_cumulative_percent"], 0)
        self.assertEqual(line["current_cumulative_percent"], 50)
        self.assertEqual(line["delta_percent"], 50)
        self.assertEqual(Decimal(line["line_gross"]), Decimal("50000"))

    def test_hakedis_period_second_period_uses_delta(self):
        resp1 = self._create_period()
        period_id = resp1.data["id"]
        self.client.post(f"/api/puantaj/hakedis-periods/{period_id}/submit/")
        self.client.force_authenticate(user=self.owner)
        self.client.post(f"/api/puantaj/hakedis-periods/{period_id}/approve/")

        self.item.completion_percent = 80
        self.item.save()

        self.client.force_authenticate(user=self.manager)
        resp2 = self.client.post(
            "/api/puantaj/hakedis-periods/",
            {
                "site_id": self.site.id,
                "period_start": "2026-07-01",
                "period_end": "2026-07-31",
            },
            format="json",
        )
        self.assertEqual(resp2.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Decimal(resp2.data["total_gross"]), Decimal("30000"))

    def test_hakedis_period_locks_after_approval(self):
        resp = self._create_period()
        period_id = resp.data["id"]

        self.client.post(f"/api/puantaj/hakedis-periods/{period_id}/submit/")
        self.client.force_authenticate(user=self.accountant)
        approve = self.client.post(f"/api/puantaj/hakedis-periods/{period_id}/approve/")
        self.assertEqual(approve.status_code, status.HTTP_200_OK)
        locked_net = Decimal(approve.data["net_payable"])

        self.item.completion_percent = 100
        self.item.save()

        period = HakedisPeriod.objects.get(pk=period_id)
        self.assertEqual(period.status, HakedisPeriod.Status.APPROVED)
        self.assertEqual(period.net_payable, locked_net)

    def test_advance_deduction_reduces_net_payable(self):
        AdvancePayment.objects.create(
            subcontractor=self.sub,
            site=self.site,
            amount=Decimal("10000"),
            payment_date=date(2026, 5, 1),
            remaining_balance=Decimal("10000"),
        )
        resp = self._create_period()
        self.assertEqual(Decimal(resp.data["total_advance_deduction"]), Decimal("10000"))
        self.assertEqual(
            Decimal(resp.data["net_payable"]),
            Decimal("50000") - Decimal("5000") - Decimal("10000"),
        )

    def test_timesheet_approval_by_site_manager(self):
        self.client.force_authenticate(user=self.manager)
        ts = Timesheet.objects.create(
            site=self.site,
            subcontractor=self.sub,
            date=date(2026, 6, 5),
            worker_count=5,
            created_by=self.manager,
        )
        resp = self.client.post(f"/api/puantaj/timesheets/{ts.id}/approve/")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data["status"], "approved")

    def test_hakedis_approve_requires_owner_or_accountant(self):
        resp = self._create_period()
        period_id = resp.data["id"]
        self.client.post(f"/api/puantaj/hakedis-periods/{period_id}/submit/")
        deny = self.client.post(f"/api/puantaj/hakedis-periods/{period_id}/approve/")
        self.assertEqual(deny.status_code, status.HTTP_403_FORBIDDEN)

        self.client.force_authenticate(user=self.owner)
        ok = self.client.post(f"/api/puantaj/hakedis-periods/{period_id}/approve/")
        self.assertEqual(ok.status_code, status.HTTP_200_OK)
