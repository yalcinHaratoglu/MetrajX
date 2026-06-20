from django.contrib import admin

from core_backend.admin_filters import CompanyFilter, SiteCompanyFilter

from .models import Site, SiteMembership


class SiteMembershipInline(admin.TabularInline):
    model = SiteMembership
    extra = 0


@admin.register(Site)
class SiteAdmin(admin.ModelAdmin):
    list_display = ("name", "code", "company", "status", "created_at")
    list_filter = (CompanyFilter, "status")
    search_fields = ("name", "code")
    inlines = [SiteMembershipInline]


@admin.register(SiteMembership)
class SiteMembershipAdmin(admin.ModelAdmin):
    list_display = ("user", "site", "site_company", "created_at")
    list_filter = (SiteCompanyFilter,)
    search_fields = ("user__email", "site__name")

    @admin.display(description="Şirket")
    def site_company(self, obj):
        return obj.site.company.name
