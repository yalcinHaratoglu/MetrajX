from django.conf import settings
from django.db import models


def daily_log_photo_path(instance, filename):
    return f"daily_logs/site_{instance.daily_log.site_id}/log_{instance.daily_log_id}/{filename}"


class DailyLog(models.Model):
    site = models.ForeignKey(
        "sites.Site",
        on_delete=models.CASCADE,
        related_name="daily_logs",
    )
    log_date = models.DateField()
    weather = models.CharField(max_length=64, blank=True)
    summary = models.TextField()
    worker_count = models.PositiveIntegerField(default=0)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="daily_logs",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-log_date", "-id"]
        unique_together = [("site", "log_date")]

    def __str__(self):
        return f"{self.site.name} — {self.log_date}"


class DailyLogPhoto(models.Model):
    daily_log = models.ForeignKey(
        DailyLog,
        on_delete=models.CASCADE,
        related_name="photos",
    )
    image = models.ImageField(upload_to=daily_log_photo_path)
    caption = models.CharField(max_length=255, blank=True)
    uploaded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["uploaded_at"]


class Asset(models.Model):
    class Status(models.TextChoices):
        AVAILABLE = "available", "Müsait"
        ASSIGNED = "assigned", "Zimmetli"
        MAINTENANCE = "maintenance", "Bakımda"
        RETIRED = "retired", "Emekli"

    site = models.ForeignKey(
        "sites.Site",
        on_delete=models.CASCADE,
        related_name="assets",
    )
    name = models.CharField(max_length=255)
    asset_type = models.CharField(max_length=64, blank=True)
    serial_number = models.CharField(max_length=128, blank=True)
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.AVAILABLE,
    )
    assigned_to = models.CharField(max_length=255, blank=True)
    purchase_date = models.DateField(null=True, blank=True)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name
