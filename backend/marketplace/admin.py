from django.contrib import admin

from .models import AppDefinition, SiteAppInstallation


@admin.register(AppDefinition)
class AppDefinitionAdmin(admin.ModelAdmin):
    list_display = ("slug", "route_path", "sort_order", "is_active")
    list_filter = ("is_active",)
    search_fields = ("slug", "title_key")


@admin.register(SiteAppInstallation)
class SiteAppInstallationAdmin(admin.ModelAdmin):
    list_display = ("site", "app", "installed_at", "installed_by")
    list_filter = ("app",)
    search_fields = ("site__name", "app__slug")
