from django.conf import settings
from django.db import models


class Site(models.Model):
    class Status(models.TextChoices):
        PLANNING = "planning", "Planlama"
        ACTIVE = "active", "Aktif"
        PAUSED = "paused", "Duraklatıldı"
        COMPLETED = "completed", "Tamamlandı"

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
    code = models.CharField(max_length=32, blank=True, help_text="Kısa kod, örn: A-BLOK")
    address = models.TextField(blank=True)
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
        help_text="Planlanan toplam bütçe (TRY)",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        unique_together = [("company", "name")]

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
