from rest_framework import serializers

from .models import AppDefinition, SiteAppInstallation


class AppDefinitionSerializer(serializers.ModelSerializer):
    class Meta:
        model = AppDefinition
        fields = (
            "id",
            "slug",
            "title_key",
            "desc_key",
            "icon_key",
            "route_path",
            "sort_order",
            "is_active",
        )


class SiteAppInstallationSerializer(serializers.ModelSerializer):
    app = AppDefinitionSerializer(read_only=True)

    class Meta:
        model = SiteAppInstallation
        fields = ("id", "site", "app", "installed_at")


class AppCatalogEntrySerializer(serializers.Serializer):
    id = serializers.IntegerField()
    slug = serializers.CharField()
    title_key = serializers.CharField()
    desc_key = serializers.CharField()
    icon_key = serializers.CharField()
    route_path = serializers.CharField()
    sort_order = serializers.IntegerField()
    is_installable = serializers.BooleanField()
    is_installed = serializers.BooleanField()
    installation_id = serializers.IntegerField(allow_null=True)


class InstallAppSerializer(serializers.Serializer):
    site_id = serializers.IntegerField()
    app_slug = serializers.SlugField()
