from rest_framework import serializers

from .models import Asset, DailyLog, DailyLogPhoto


class DailyLogPhotoSerializer(serializers.ModelSerializer):
    image_url = serializers.SerializerMethodField()

    class Meta:
        model = DailyLogPhoto
        fields = ("id", "caption", "image_url", "uploaded_at")
        read_only_fields = ("id", "image_url", "uploaded_at")

    def get_image_url(self, obj):
        request = self.context.get("request")
        if not obj.image:
            return None
        url = obj.image.url
        return request.build_absolute_uri(url) if request else url


class DailyLogSerializer(serializers.ModelSerializer):
    photos = DailyLogPhotoSerializer(many=True, read_only=True)
    created_by_name = serializers.SerializerMethodField()

    class Meta:
        model = DailyLog
        fields = (
            "id",
            "site",
            "log_date",
            "weather",
            "summary",
            "worker_count",
            "photos",
            "created_by_name",
            "created_at",
        )
        read_only_fields = ("id", "site", "photos", "created_by_name", "created_at")

    def get_created_by_name(self, obj):
        if not obj.created_by:
            return ""
        return obj.created_by.get_full_name() or obj.created_by.email


class DailyLogCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = DailyLog
        fields = ("log_date", "weather", "summary", "worker_count")


class AssetSerializer(serializers.ModelSerializer):
    class Meta:
        model = Asset
        fields = (
            "id",
            "site",
            "name",
            "asset_type",
            "serial_number",
            "status",
            "assigned_to",
            "purchase_date",
            "notes",
            "created_at",
        )
        read_only_fields = ("id", "site", "created_at")


class AssetCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Asset
        fields = (
            "name",
            "asset_type",
            "serial_number",
            "status",
            "assigned_to",
            "purchase_date",
            "notes",
        )
