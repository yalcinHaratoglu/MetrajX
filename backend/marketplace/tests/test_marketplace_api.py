from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient

from authentication.models import Company
from marketplace.models import AppDefinition, SiteAppInstallation
from sites.models import Site, SiteMembership

User = get_user_model()


class MarketplaceAPITestCase(TestCase):
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
        SiteMembership.objects.create(user=self.manager, site=self.site)
        self.rebar_app, _ = AppDefinition.objects.get_or_create(
            slug="rebar",
            defaults={
                "title_key": "nav.rebar",
                "desc_key": "applications.rebar.desc",
                "icon_key": "scissors",
                "route_path": "/apps/rebar",
                "sort_order": 10,
            },
        )

    def test_catalog_requires_site_id(self):
        self.client.force_authenticate(user=self.owner)
        response = self.client.get("/api/marketplace/catalog/")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_catalog_shows_install_status(self):
        SiteAppInstallation.objects.create(site=self.site, app=self.rebar_app, installed_by=self.owner)
        self.client.force_authenticate(user=self.owner)
        response = self.client.get(f"/api/marketplace/catalog/?site_id={self.site.id}")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        entry = next(item for item in response.data if item["slug"] == "rebar")
        self.assertTrue(entry["is_installed"])
        self.assertIsNotNone(entry["installation_id"])

    def test_install_app_by_manager(self):
        self.client.force_authenticate(user=self.manager)
        response = self.client.post(
            "/api/marketplace/installations/create/",
            {"site_id": self.site.id, "app_slug": "rebar"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(
            SiteAppInstallation.objects.filter(site=self.site, app=self.rebar_app).exists()
        )

    def test_accountant_cannot_install(self):
        self.client.force_authenticate(user=self.accountant)
        response = self.client.post(
            "/api/marketplace/installations/create/",
            {"site_id": self.site.id, "app_slug": "rebar"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_list_installations_for_sidebar(self):
        inst = SiteAppInstallation.objects.create(
            site=self.site, app=self.rebar_app, installed_by=self.owner
        )
        self.client.force_authenticate(user=self.manager)
        response = self.client.get(f"/api/marketplace/installations/?site_id={self.site.id}")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["id"], inst.id)
        self.assertEqual(response.data[0]["app"]["slug"], "rebar")

    def test_uninstall_app(self):
        inst = SiteAppInstallation.objects.create(
            site=self.site, app=self.rebar_app, installed_by=self.owner
        )
        self.client.force_authenticate(user=self.owner)
        response = self.client.delete(f"/api/marketplace/installations/{inst.id}/")
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(SiteAppInstallation.objects.filter(pk=inst.id).exists())
