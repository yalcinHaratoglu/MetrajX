from django.conf import settings
from django.db import models


class Site(models.Model):
    class Status(models.TextChoices):
        PLANNING = "planning", "Planlama"
        ACTIVE = "active", "Aktif"
        PAUSED = "paused", "Duraklatıldı"
        COMPLETED = "completed", "Tamamlandı"

    class ProjectType(models.TextChoices):
        RESIDENTIAL = "residential", "Konut"
        COMMERCIAL = "commercial", "Ticari"
        INDUSTRIAL = "industrial", "Endüstriyel"
        INFRASTRUCTURE = "infrastructure", "Altyapı/Yol"

    class Currency(models.TextChoices):
        TRY = "TRY", "TRY"
        USD = "USD", "USD"
        EUR = "EUR", "EUR"

    company = models.ForeignKey(
        "authentication.Company",
        on_delete=models.CASCADE,
        related_name="sites",
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="created_sites",
    )
    name = models.CharField(max_length=255)
    code = models.CharField(max_length=32, help_text="Benzersiz şantiye kodu, örn: CM-2026-001")
    project_type = models.CharField(
        max_length=20,
        choices=ProjectType.choices,
        blank=True,
    )
    client_owner = models.CharField(
        max_length=255,
        blank=True,
        help_text="İşveren / mal sahibi",
    )
    address = models.TextField(blank=True)
    city = models.CharField(max_length=100, blank=True)
    parcel_number = models.CharField(
        max_length=64,
        blank=True,
        help_text="Ada / parsel numarası",
    )
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.ACTIVE,
    )
    start_date = models.DateField(null=True, blank=True)
    planned_end_date = models.DateField(null=True, blank=True)
    budget_total = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="Planlanan toplam bütçe",
    )
    currency = models.CharField(
        max_length=3,
        choices=Currency.choices,
        default=Currency.TRY,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        unique_together = [("company", "name"), ("company", "code")]

    def __str__(self):
        return self.name


class SiteMembership(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="site_memberships",
    )
    site = models.ForeignKey(
        Site,
        on_delete=models.CASCADE,
        related_name="memberships",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = [("user", "site")]

    def __str__(self):
        return f"{self.user.email} → {self.site.name}"
