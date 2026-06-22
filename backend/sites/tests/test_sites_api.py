from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient

from authentication.models import Company
from rebar_optimizer.models import Project
from sites.models import Site, SiteMembership

User = get_user_model()


class SitesAPITestCase(TestCase):
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
        self.site_manager = User.objects.create_user(
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
        self.site_a = Site.objects.create(
            company=self.company,
            created_by=self.owner,
            name="A Blok",
            code="A",
        )
        self.site_b = Site.objects.create(
            company=self.company,
            created_by=self.owner,
            name="B Blok",
            code="B",
        )
        SiteMembership.objects.create(user=self.site_manager, site=self.site_a)

    def test_list_sites_owner_sees_all(self):
        self.client.force_authenticate(user=self.owner)
        response = self.client.get("/api/sites/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 2)

    def test_list_sites_manager_sees_assigned_only(self):
        self.client.force_authenticate(user=self.site_manager)
        response = self.client.get("/api/sites/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["name"], "A Blok")

    def test_list_sites_accountant_sees_all(self):
        self.client.force_authenticate(user=self.accountant)
        response = self.client.get("/api/sites/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 2)

    def test_create_site_creates_rebar_project(self):
        self.client.force_authenticate(user=self.owner)
        response = self.client.post(
            "/api/sites/",
            {"name": "C Blok", "code": "C", "status": "active"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        site = Site.objects.get(name="C Blok")
        self.assertTrue(Project.objects.filter(site=site).exists())
        self.assertEqual(response.data["project_id"], site.rebar_project.id)

    def test_accountant_cannot_create_site(self):
        self.client.force_authenticate(user=self.accountant)
        response = self.client.post(
            "/api/sites/",
            {"name": "Yeni", "code": "Y", "status": "active"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_only_owner_can_delete_site(self):
        self.client.force_authenticate(user=self.site_manager)
        response = self.client.delete(f"/api/sites/{self.site_a.id}/")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

        self.client.force_authenticate(user=self.owner)
        response = self.client.delete(f"/api/sites/{self.site_b.id}/")
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Site.objects.filter(pk=self.site_b.id).exists())

    def test_delete_site_with_hakedis_data(self):
        from metraj.models import MetrajCategory, MetrajItem
        from puantaj.models import HakedisPeriod, HakedisPeriodLine, Subcontractor

        category = MetrajCategory.objects.create(slug="test-cat", name="Test")
        sub = Subcontractor.objects.create(
            site=self.site_b, name="Taşeron X", category=category
        )
        item = MetrajItem.objects.create(
            site=self.site_b,
            category=category,
            description="Kalem 1",
        )
        period = HakedisPeriod.objects.create(
            site=self.site_b,
            period_start="2026-06-01",
            period_end="2026-06-30",
        )
        HakedisPeriodLine.objects.create(
            period=period,
            metraj_item=item,
            subcontractor=sub,
            quantity=10,
            current_cumulative_percent=50,
            delta_percent=50,
            line_gross=1000,
        )

        self.client.force_authenticate(user=self.owner)
        response = self.client.delete(f"/api/sites/{self.site_b.id}/")
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Site.objects.filter(pk=self.site_b.id).exists())

    def test_my_sites_endpoint(self):
        self.client.force_authenticate(user=self.site_manager)
        response = self.client.get("/api/sites/mine/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["code"], "A")
