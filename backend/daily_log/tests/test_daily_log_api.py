from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient

from authentication.models import Company
from daily_log.models import Asset, DailyLog
from sites.models import Site

User = get_user_model()


class DailyLogAPITestCase(TestCase):
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

    def test_create_daily_log(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.post(
            "/api/daily-logs/",
            {
                "site_id": self.site.id,
                "log_date": "2026-07-01",
                "summary": "Saha çalışması devam ediyor.",
                "worker_count": 12,
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(DailyLog.objects.count(), 1)

    def test_create_asset(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.post(
            "/api/assets/",
            {"site_id": self.site.id, "name": "Vinç 1", "asset_type": "vinç"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Asset.objects.count(), 1)

    def test_delete_daily_log_photo(self):
        from django.core.files.uploadedfile import SimpleUploadedFile

        from daily_log.models import DailyLogPhoto

        self.client.force_authenticate(user=self.user)
        log = DailyLog.objects.create(
            site=self.site,
            created_by=self.user,
            log_date="2026-07-02",
            summary="Test raporu",
            worker_count=5,
        )
        upload = SimpleUploadedFile("rapor.pdf", b"pdf-content", content_type="application/pdf")
        create_resp = self.client.post(
            f"/api/daily-logs/{log.id}/photos/",
            {"file": upload},
            format="multipart",
        )
        self.assertEqual(create_resp.status_code, status.HTTP_201_CREATED)
        photo_id = create_resp.data["id"]

        delete_resp = self.client.delete(f"/api/daily-logs/{log.id}/photos/{photo_id}/")
        self.assertEqual(delete_resp.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(DailyLogPhoto.objects.filter(pk=photo_id).exists())
