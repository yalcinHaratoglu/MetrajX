from datetime import date
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient

from authentication.models import Company
from daily_log.services.draft import (
    _format_quantity_tr,
    build_daily_log_suggestions,
)
from metraj.models import MetrajCategory, MetrajItem, MetrajOperation
from puantaj.models import Subcontractor, Timesheet, Worker
from sites.models import Site

User = get_user_model()


class DraftFormatTestCase(TestCase):
    def test_format_quantity_tr(self):
        self.assertEqual(_format_quantity_tr(Decimal("30")), "30")
        self.assertEqual(_format_quantity_tr(Decimal("30.000")), "30")
        self.assertEqual(_format_quantity_tr(Decimal("30.5")), "30,5")
        self.assertEqual(_format_quantity_tr(Decimal("30000")), "30\u202f000")
        self.assertEqual(_format_quantity_tr(Decimal("140000")), "140\u202f000")
        self.assertNotIn("30.000", _format_quantity_tr(Decimal("30")))


class DraftSummaryTestCase(TestCase):
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
        self.category = MetrajCategory.objects.create(
            company=self.company,
            slug="beton",
            name="Beton",
            default_unit="m3",
            is_custom=True,
        )
        self.sub = Subcontractor.objects.create(
            site=self.site, name="Betoncu Ali", category=self.category
        )
        self.item = MetrajItem.objects.create(
            site=self.site,
            category=self.category,
            description="C25 Temel Betonu",
            unit="m3",
            subcontractor=self.sub,
        )

    def test_summary_formats_small_quantity_without_trailing_zeros(self):
        MetrajOperation.objects.create(
            item=self.item,
            title="Döküm",
            scheduled_date="2026-06-20",
            status=MetrajOperation.Status.DONE,
            quantity_done=Decimal("30"),
        )
        result = build_daily_log_suggestions(self.site, date(2026, 6, 20))
        self.assertIn("30 m³", result["summary"])
        self.assertNotIn("30.000", result["summary"])

    def test_summary_formats_large_quantity_with_thin_space(self):
        MetrajOperation.objects.create(
            item=self.item,
            title="Döküm",
            scheduled_date="2026-06-20",
            status=MetrajOperation.Status.DONE,
            quantity_done=Decimal("30000"),
        )
        result = build_daily_log_suggestions(self.site, date(2026, 6, 20))
        self.assertIn("30\u202f000 m³", result["summary"])

    def test_attendance_grouped_by_subcontractor(self):
        MetrajOperation.objects.create(
            item=self.item,
            title="Döküm",
            scheduled_date="2026-06-20",
            status=MetrajOperation.Status.DONE,
            quantity_done=Decimal("10"),
        )
        sub2 = Subcontractor.objects.create(
            site=self.site, name="Sıvacı Kamil", category=self.category
        )
        item2 = MetrajItem.objects.create(
            site=self.site,
            category=self.category,
            description="Dış cephe sıvası",
            unit="m2",
            subcontractor=sub2,
        )
        MetrajOperation.objects.create(
            item=item2,
            title="Sıva",
            scheduled_date="2026-06-20",
            status=MetrajOperation.Status.DONE,
            quantity_done=Decimal("100"),
        )
        for i in range(5):
            w = Worker.objects.create(
                subcontractor=self.sub,
                employment_type=Worker.EmploymentType.SUBCONTRACTOR,
                first_name=f"B{i}",
                last_name="Test",
            )
            Timesheet.objects.create(
                site=self.site,
                subcontractor=self.sub,
                worker=w,
                date="2026-06-20",
            )
        for i in range(6):
            w = Worker.objects.create(
                subcontractor=sub2,
                employment_type=Worker.EmploymentType.SUBCONTRACTOR,
                first_name=f"S{i}",
                last_name="Test",
            )
            Timesheet.objects.create(
                site=self.site,
                subcontractor=sub2,
                worker=w,
                date="2026-06-20",
            )

        result = build_daily_log_suggestions(self.site, date(2026, 6, 20))
        self.assertEqual(result["worker_count"], 11)
        self.assertIn("Betoncu Ali - 5 kişi", result["summary"])
        self.assertIn("Sıvacı Kamil - 6 kişi", result["summary"])
        self.assertEqual(len(result["attendance_lines"]), 2)


class DailyLogSuggestAPITestCase(TestCase):
    def setUp(self):
        self.client = APIClient()
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

    def test_suggest_endpoint(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.get(
            "/api/daily-logs/suggest/",
            {"site_id": self.site.id, "log_date": "2026-06-20"},
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("summary", response.data)
        self.assertIn("worker_count", response.data)
        self.assertIn("attendance_lines", response.data)
