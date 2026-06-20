from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient

from authentication.models import ActivationToken, Company

User = get_user_model()


class AuthAPITestCase(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            email="test@conmanage.com",
            password="TestPass123!",
            first_name="Test",
            last_name="User",
            is_active=True,
        )

    def test_health_endpoint(self):
        response = self.client.get("/api/auth/health/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["status"], "ok")

    def test_login_with_email(self):
        response = self.client.post(
            "/api/auth/login/",
            {"email": "test@conmanage.com", "password": "TestPass123!"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("access", response.data)
        self.assertIn("refresh", response.data)

    def test_profile_requires_auth(self):
        response = self.client.get("/api/auth/profile/")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_profile_authenticated(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.get("/api/auth/profile/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["email"], "test@conmanage.com")

    def test_activate_account(self):
        self.user.is_active = False
        self.user.save(update_fields=["is_active"])
        token = ActivationToken.objects.create(
            user=self.user,
            purpose=ActivationToken.Purpose.REGISTRATION,
        )

        response = self.client.get(f"/api/auth/activate/{token.token}/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        self.user.refresh_from_db()
        token.refresh_from_db()
        self.assertTrue(self.user.is_active)
        self.assertTrue(token.is_used)

    def test_activate_idempotent_on_repeat(self):
        self.user.is_active = False
        self.user.save(update_fields=["is_active"])
        token = ActivationToken.objects.create(
            user=self.user,
            purpose=ActivationToken.Purpose.REGISTRATION,
        )

        first = self.client.get(f"/api/auth/activate/{token.token}/")
        second = self.client.get(f"/api/auth/activate/{token.token}/")

        self.assertEqual(first.status_code, status.HTTP_200_OK)
        self.assertEqual(second.status_code, status.HTTP_200_OK)
        self.assertTrue(self.user.__class__.objects.get(pk=self.user.pk).is_active)

    def test_invite_token_cannot_use_activate_endpoint(self):
        self.user.is_active = False
        self.user.save(update_fields=["is_active"])
        token = ActivationToken.objects.create(
            user=self.user,
            purpose=ActivationToken.Purpose.INVITE,
        )

        response = self.client.get(f"/api/auth/activate/{token.token}/")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertTrue(response.data.get("redirect_to_invite"))


class InviteAcceptTestCase(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.company = Company.objects.create(name="Test İnşaat")
        self.invited = User.objects.create_user(
            email="invited@conmanage.com",
            first_name="Davet",
            last_name="Edilen",
            company=self.company,
            role=User.Role.ACCOUNTANT,
            is_active=False,
        )
        self.invited.set_unusable_password()
        self.invited.save()
        self.token = ActivationToken.objects.create(
            user=self.invited,
            purpose=ActivationToken.Purpose.INVITE,
        )

    def test_invite_preview(self):
        response = self.client.get(f"/api/auth/invite/{self.token.token}/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["email"], "invited@conmanage.com")
        self.assertEqual(response.data["company_name"], "Test İnşaat")
        self.assertFalse(response.data["already_accepted"])

    def test_invite_accept_sets_password_and_activates(self):
        response = self.client.post(
            f"/api/auth/invite/{self.token.token}/",
            {"password": "InvitePass123!", "password_confirm": "InvitePass123!"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        self.invited.refresh_from_db()
        self.token.refresh_from_db()
        self.assertTrue(self.invited.is_active)
        self.assertTrue(self.invited.has_usable_password())
        self.assertTrue(self.token.is_used)

        login = self.client.post(
            "/api/auth/login/",
            {"email": "invited@conmanage.com", "password": "InvitePass123!"},
            format="json",
        )
        self.assertEqual(login.status_code, status.HTTP_200_OK)

    def test_invite_password_mismatch(self):
        response = self.client.post(
            f"/api/auth/invite/{self.token.token}/",
            {"password": "InvitePass123!", "password_confirm": "OtherPass123!"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_invite_idempotent_after_accept(self):
        self.client.post(
            f"/api/auth/invite/{self.token.token}/",
            {"password": "InvitePass123!", "password_confirm": "InvitePass123!"},
            format="json",
        )
        second = self.client.post(
            f"/api/auth/invite/{self.token.token}/",
            {"password": "InvitePass123!", "password_confirm": "InvitePass123!"},
            format="json",
        )
        self.assertEqual(second.status_code, status.HTTP_200_OK)
