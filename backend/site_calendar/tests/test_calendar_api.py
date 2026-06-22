from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient

from authentication.models import Company
from site_calendar.models import CalendarEvent
from sites.models import Site

User = get_user_model()


class CalendarAPITestCase(TestCase):
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

    def test_create_calendar_event(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.post(
            "/api/calendar/events/",
            {
                "site_id": self.site.id,
                "title": "Beton dökümü",
                "event_date": "2026-07-01",
                "event_type": "concrete",
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(CalendarEvent.objects.count(), 1)

    def test_unified_calendar(self):
        CalendarEvent.objects.create(
            site=self.site,
            title="Teslimat",
            event_date="2026-07-02",
            created_by=self.user,
        )
        self.client.force_authenticate(user=self.user)
        response = self.client.get(f"/api/calendar/unified/?site_id={self.site.id}")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data["events"]), 1)
