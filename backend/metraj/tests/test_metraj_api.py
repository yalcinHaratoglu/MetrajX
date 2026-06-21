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
        self.category = MetrajCategory.objects.get(slug="beton")
        self.client.force_authenticate(user=self.owner)

    def test_list_categories(self):
        response = self.client.get("/api/metraj/categories/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(len(response.data), 6)

    def test_create_and_list_items(self):
        response = self.client.post(
            "/api/metraj/items/",
            {
                "site_id": self.site.id,
                "category": self.category.id,
                "description": "Temel betonu",
                "unit": "m3",
                "quantity": "120.5",
                "completion_percent": 40,
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        listing = self.client.get(f"/api/metraj/items/?site_id={self.site.id}")
        self.assertEqual(listing.status_code, status.HTTP_200_OK)
        self.assertEqual(len(listing.data), 1)

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
