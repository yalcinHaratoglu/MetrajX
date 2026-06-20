from rest_framework import serializers

from .models import CuttingPlan, Floor, OptimizationRun, Project, RebarElement, RebarRequirement


class RebarRequirementSerializer(serializers.ModelSerializer):
    class Meta:
        model = RebarRequirement
        fields = (
            "id",
            "diameter_mm",
            "length_m",
            "quantity",
            "element_ref",
            "notes",
            "floor",
            "element",
        )
        read_only_fields = ("id",)


class RebarRequirementCreateSerializer(serializers.Serializer):
    diameter_mm = serializers.IntegerField(min_value=4)
    length_m = serializers.DecimalField(max_digits=8, decimal_places=2)
    quantity = serializers.IntegerField(min_value=1, default=1)
    element_ref = serializers.CharField(max_length=64, required=False, allow_blank=True)
    floor_name = serializers.CharField(max_length=100, required=False, allow_blank=True)
    notes = serializers.CharField(max_length=255, required=False, allow_blank=True)


class FloorSerializer(serializers.ModelSerializer):
    class Meta:
        model = Floor
        fields = ("id", "name", "order")
        read_only_fields = ("id",)


class ProjectSerializer(serializers.ModelSerializer):
    floors = FloorSerializer(many=True, read_only=True)
    requirements_count = serializers.SerializerMethodField()

    class Meta:
        model = Project
        fields = (
            "id",
            "name",
            "status",
            "source_file",
            "floors",
            "requirements_count",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "status", "created_at", "updated_at")

    def get_requirements_count(self, obj):
        return obj.requirements.count()


class ProjectCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Project
        fields = ("id", "name", "source_file", "status", "created_at")
        read_only_fields = ("id", "status", "created_at")


class OptimizationRunSerializer(serializers.ModelSerializer):
    class Meta:
        model = OptimizationRun
        fields = ("id", "bar_length_m", "waste_percent", "created_at")
        read_only_fields = ("id", "waste_percent", "created_at")


class CuttingPlanSerializer(serializers.ModelSerializer):
    class Meta:
        model = CuttingPlan
        fields = ("id", "diameter_mm", "stock_bar_index", "cuts", "waste_m")
