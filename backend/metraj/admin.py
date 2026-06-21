from django.contrib import admin

from core_backend.admin_scope import CompanyScopedAdminMixin

from .models import MetrajCategory, MetrajDocument, MetrajItem


@admin.register(MetrajCategory)
class MetrajCategoryAdmin(admin.ModelAdmin):
    list_display = ("name", "slug", "company", "is_custom", "default_unit", "sort_order")
    list_filter = ("is_custom",)
    prepopulated_fields = {"slug": ("name",)}


@admin.register(MetrajItem)
class MetrajItemAdmin(CompanyScopedAdminMixin, admin.ModelAdmin):
    company_filter_field = "site__company_id"
    list_display = (
        "description",
        "site",
        "category",
        "quantity",
        "unit",
        "completion_percent",
    )
    list_filter = ("category",)
    search_fields = ("description", "site__name")


@admin.register(MetrajDocument)
class MetrajDocumentAdmin(CompanyScopedAdminMixin, admin.ModelAdmin):
    company_filter_field = "site__company_id"
    list_display = ("title", "site", "file_kind", "original_filename", "created_at")
    search_fields = ("title", "original_filename")
