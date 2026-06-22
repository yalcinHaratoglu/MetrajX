from django.conf import settings
from django.db import models


class CalendarEvent(models.Model):
    class EventType(models.TextChoices):
        CONCRETE = "concrete", "Beton Dökümü"
        DELIVERY = "delivery", "Malzeme Teslimatı"
        DEADLINE = "deadline", "Son Tarih"
        MEETING = "meeting", "Toplantı"
        OTHER = "other", "Diğer"

    site = models.ForeignKey(
        "sites.Site",
        on_delete=models.CASCADE,
        related_name="calendar_events",
    )
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    event_date = models.DateField()
    event_time = models.TimeField(null=True, blank=True)
    event_type = models.CharField(
        max_length=20,
        choices=EventType.choices,
        default=EventType.OTHER,
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="calendar_events",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["event_date", "event_time", "id"]

    def __str__(self):
        return f"{self.title} ({self.event_date})"
