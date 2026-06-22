from django.conf import settings
from django.db import models


class AppDefinition(models.Model):
    """Platform genelinde tanımlı uygulama kataloğu."""

    slug = models.SlugField(max_length=64, unique=True)
    title_key = models.CharField(max_length=128, help_text="Frontend i18n anahtarı")
    desc_key = models.CharField(max_length=128, help_text="Frontend i18n açıklama anahtarı")
    icon_key = models.CharField(max_length=64, default="layout-grid")
    route_path = models.CharField(max_length=128, help_text="Örn: /apps/rebar")
    sort_order = models.PositiveIntegerField(default=100)
    is_active = models.BooleanField(default=True)
    is_installable = models.BooleanField(
        default=True,
        help_text="False ise katalogda görünür ama kurulamaz (yakında modüller)",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["sort_order", "slug"]

    def __str__(self):
        return self.slug


class SiteAppInstallation(models.Model):
    """Şantiye bazında kurulu uygulama."""

    site = models.ForeignKey(
        "sites.Site",
        on_delete=models.CASCADE,
        related_name="app_installations",
    )
    app = models.ForeignKey(
        AppDefinition,
        on_delete=models.CASCADE,
        related_name="installations",
    )
    installed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="app_installations",
    )
    installed_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = [("site", "app")]
        ordering = ["app__sort_order", "app__slug"]

    def __str__(self):
        return f"{self.site.name} — {self.app.slug}"
