from django.contrib import admin

from .models import CuttingPlan, Floor, OptimizationRun, Project, RebarElement, RebarRequirement


@admin.register(Project)
class ProjectAdmin(admin.ModelAdmin):
    list_display = ("name", "company", "status", "created_at")
    list_filter = ("status",)


admin.site.register(Floor)
admin.site.register(RebarElement)
admin.site.register(RebarRequirement)
admin.site.register(OptimizationRun)
admin.site.register(CuttingPlan)
