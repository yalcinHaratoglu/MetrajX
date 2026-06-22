from rest_framework import serializers

from metraj.serializers import MetrajOperationSerializer

from .models import CalendarEvent


class CalendarEventSerializer(serializers.ModelSerializer):
    class Meta:
        model = CalendarEvent
        fields = (
            "id",
            "site",
            "title",
            "description",
            "event_date",
            "event_time",
            "event_type",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "site", "created_at", "updated_at")


class CalendarEventCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = CalendarEvent
        fields = ("title", "description", "event_date", "event_time", "event_type")


class UnifiedCalendarSerializer(serializers.Serializer):
    operations = MetrajOperationSerializer(many=True)
    events = CalendarEventSerializer(many=True)
