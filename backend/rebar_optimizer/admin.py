from django.contrib import admin

from core_backend.admin_filters import CompanyFilter, ProjectCompanyFilter

from .models import CuttingPlan, Floor, OptimizationRun, Project, RebarElement, RebarRequirement


@admin.register(Project)
class ProjectAdmin(admin.ModelAdmin):
    list_display = ("name", "company", "site", "status", "created_at")
    list_filter = (CompanyFilter, "status")
    search_fields = ("name",)


@admin.register(Floor)
class FloorAdmin(admin.ModelAdmin):
    list_display = ("name", "project", "project_company", "order")
    list_filter = (ProjectCompanyFilter,)

    @admin.display(description="Şirket")
    def project_company(self, obj):
        return obj.project.company.name if obj.project.company else "—"

    def get_queryset(self, request):
        return super().get_queryset(request).select_related("project__company")


@admin.register(RebarRequirement)
class RebarRequirementAdmin(admin.ModelAdmin):
    list_display = ("id", "project", "diameter_mm", "length_m", "quantity")
    list_filter = (ProjectCompanyFilter,)

    def get_queryset(self, request):
        return super().get_queryset(request).select_related("project__company")


admin.site.register(RebarElement)
admin.site.register(OptimizationRun)
admin.site.register(CuttingPlan)
