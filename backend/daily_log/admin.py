from django.contrib import admin

from .models import Asset, DailyLog, DailyLogPhoto


class DailyLogPhotoInline(admin.TabularInline):
    model = DailyLogPhoto
    extra = 0


@admin.register(DailyLog)
class DailyLogAdmin(admin.ModelAdmin):
    list_display = ("site", "log_date", "worker_count")
    inlines = [DailyLogPhotoInline]


@admin.register(Asset)
class AssetAdmin(admin.ModelAdmin):
    list_display = ("name", "site", "status", "assigned_to")
