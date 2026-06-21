from django.contrib import admin

from core_backend.admin_scope import CompanyScopedAdminMixin

from .models import Site, SiteMembership


class SiteMembershipInline(admin.TabularInline):
    model = SiteMembership
    extra = 0


@admin.register(Site)
class SiteAdmin(CompanyScopedAdminMixin, admin.ModelAdmin):
    company_filter_field = "company_id"
    list_display = ("name", "code", "company", "status", "created_at")
    list_filter = ("status",)
    search_fields = ("name", "code")
    inlines = [SiteMembershipInline]


@admin.register(SiteMembership)
class SiteMembershipAdmin(CompanyScopedAdminMixin, admin.ModelAdmin):
    company_filter_field = "site__company_id"
    list_display = ("user", "site", "site_company", "created_at")
    search_fields = ("user__email", "site__name")

    @admin.display(description="Şirket")
    def site_company(self, obj):
        return obj.site.company.name
