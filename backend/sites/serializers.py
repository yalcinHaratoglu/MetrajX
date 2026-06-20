from rest_framework import serializers

from .models import Site


class SiteSerializer(serializers.ModelSerializer):
    project_id = serializers.SerializerMethodField()
    requirements_count = serializers.SerializerMethodField()

    class Meta:
        model = Site
        fields = (
            "id",
            "name",
            "code",
            "address",
            "status",
            "start_date",
            "planned_end_date",
            "budget_total",
            "project_id",
            "requirements_count",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "project_id", "requirements_count", "created_at", "updated_at")

    def get_project_id(self, obj):
        project = getattr(obj, "rebar_project", None)
        return project.id if project else None

    def get_requirements_count(self, obj):
        project = getattr(obj, "rebar_project", None)
        if not project:
            return 0
        return project.requirements.count()


class SiteCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Site
        fields = ("id", "name", "code", "address", "status", "start_date", "planned_end_date", "budget_total")
        read_only_fields = ("id",)
