import io

from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient

from authentication.models import Company
from rebar_optimizer.models import Project, RebarRequirement
from rebar_optimizer.services import OptimizerService

User = get_user_model()


def _xlsx_bytes(rows: list[list]) -> io.BytesIO:
    from openpyxl import Workbook

    workbook = Workbook()
    sheet = workbook.active
    sheet.append(["Çap (mm)", "Boy (m)", "Adet", "Eleman No"])
    for row in rows:
        sheet.append(row)
    buffer = io.BytesIO()
    workbook.save(buffer)
    buffer.seek(0)
    return buffer


class ImportReplaceTests(TestCase):
    def setUp(self):
        self.company = Company.objects.create(name="ACME")
        self.user = User.objects.create_user(
            email="eng@conmanage.com",
            password="TestPass123!",
            first_name="Eng",
            last_name="User",
            is_active=True,
            company=self.company,
            role=User.Role.OWNER,
        )
        self.project = Project.objects.create(company=self.company, name="P1")

    def test_import_from_file_replaces_existing(self):
        # Önce bir kalem ekle
        RebarRequirement.objects.create(
            project=self.project, diameter_mm=8, length_m=2.0, quantity=5
        )
        self.assertEqual(self.project.requirements.count(), 1)

        # Dosya importu mevcut veriyi değiştirmeli (append değil)
        buffer = _xlsx_bytes([[16, 4.5, 10, "K-101"], [12, 3.0, 24, "K-102"]])
        OptimizerService.import_from_file(self.project, buffer, "metraj.xlsx")

        diameters = sorted(self.project.requirements.values_list("diameter_mm", flat=True))
        self.assertEqual(diameters, [12, 16])  # 8'lik (eski) silinmiş olmalı
        self.assertEqual(self.project.requirements.count(), 2)

    def test_import_with_no_rows_keeps_existing(self):
        RebarRequirement.objects.create(
            project=self.project, diameter_mm=8, length_m=2.0, quantity=5
        )
        empty = _xlsx_bytes([])  # sadece başlık satırı, veri yok
        rows = OptimizerService.import_from_file(self.project, empty, "bos.xlsx")
        self.assertEqual(rows, [])
        self.assertEqual(self.project.requirements.count(), 1)  # eski korunur


class BulkDeleteApiTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.company = Company.objects.create(name="ACME")
        self.user = User.objects.create_user(
            email="eng@conmanage.com",
            password="TestPass123!",
            first_name="Eng",
            last_name="User",
            is_active=True,
            company=self.company,
            role=User.Role.OWNER,
        )
        self.client.force_authenticate(user=self.user)
        self.project = Project.objects.create(company=self.company, name="P1")
        for dia in (8, 12, 16):
            RebarRequirement.objects.create(
                project=self.project, diameter_mm=dia, length_m=3.0, quantity=2
            )

    def test_bulk_delete_clears_all_requirements(self):
        self.assertEqual(self.project.requirements.count(), 3)
        response = self.client.delete(f"/api/projects/{self.project.id}/requirements/")
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(self.project.requirements.count(), 0)
