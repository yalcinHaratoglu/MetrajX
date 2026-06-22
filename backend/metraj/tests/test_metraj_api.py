from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient

from authentication.models import Company
from metraj.models import MetrajCategory, MetrajItem
from sites.models import Site

User = get_user_model()


class MetrajAPITestCase(TestCase):
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
        self.site = Site.objects.create(
            company=self.company,
            created_by=self.owner,
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
        self.client.force_authenticate(user=self.owner)

    def test_list_categories(self):
        response = self.client.get("/api/metraj/categories/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)

    def test_create_and_list_items(self):
        response = self.client.post(
            "/api/metraj/items/",
            {
                "site_id": self.site.id,
                "category": self.category.id,
                "description": "Temel betonu",
                "unit": "m3",
                "quantity": "120.5",
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        listing = self.client.get(f"/api/metraj/items/?site_id={self.site.id}")
        self.assertEqual(listing.status_code, status.HTTP_200_OK)
        self.assertEqual(len(listing.data), 1)

    def test_operations_update_item_progress(self):
        from datetime import date

        item = MetrajItem.objects.create(
            site=self.site,
            category=self.category,
            description="Duvar",
            unit="m2",
            quantity=100,
        )
        response = self.client.post(
            f"/api/metraj/items/{item.id}/operations/",
            {
                "title": "Sıva",
                "scheduled_date": str(date.today()),
                "status": "done",
                "progress_percent": 40,
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        cal = self.client.get(f"/api/metraj/calendar/?site_id={self.site.id}")
        self.assertEqual(cal.status_code, status.HTTP_200_OK)
        self.assertEqual(len(cal.data), 1)

        item.refresh_from_db()
        self.assertEqual(item.completion_percent, 40)

    def test_multiple_operations_same_day(self):
        from datetime import date

        item = MetrajItem.objects.create(
            site=self.site,
            category=self.category,
            description="Döşeme",
            unit="m2",
            quantity=50,
        )
        payload = {
            "title": "Beton",
            "scheduled_date": str(date.today()),
            "status": "planned",
            "progress_percent": 10,
        }
        first = self.client.post(
            f"/api/metraj/items/{item.id}/operations/",
            payload,
            format="json",
        )
        self.assertEqual(first.status_code, status.HTTP_201_CREATED)

        second = self.client.post(
            f"/api/metraj/items/{item.id}/operations/",
            {**payload, "title": "Demir"},
            format="json",
        )
        self.assertEqual(second.status_code, status.HTTP_201_CREATED)
        self.assertEqual(item.operations.filter(scheduled_date=date.today()).count(), 2)

    def test_document_upload_rejects_large_file(self):
        from django.core.files.uploadedfile import SimpleUploadedFile

        item = MetrajItem.objects.create(
            site=self.site,
            category=self.category,
            description="Duvar",
            unit="m2",
            quantity=10,
        )
        large = SimpleUploadedFile(
            "big.pdf",
            b"x" * (10 * 1024 * 1024 + 1),
            content_type="application/pdf",
        )
        response = self.client.post(
            "/api/metraj/documents/",
            {"site_id": self.site.id, "item_id": item.id, "file": large},
            format="multipart",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_summary(self):
        MetrajItem.objects.create(
            site=self.site,
            category=self.category,
            description="Test",
            unit="m3",
            quantity=100,
            completion_percent=50,
        )
        response = self.client.get(f"/api/metraj/summary/?site_id={self.site.id}")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["item_count"], 1)
        self.assertEqual(response.data["average_progress"], 50.0)
