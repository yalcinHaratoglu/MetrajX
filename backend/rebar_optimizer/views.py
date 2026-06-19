from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Floor, OptimizationRun, Project, RebarRequirement
from .optimization_engine import optimize_cutting_stock
from .serializers import (
    OptimizationRunSerializer,
    ProjectCreateSerializer,
    ProjectSerializer,
    RebarRequirementCreateSerializer,
    RebarRequirementSerializer,
)


class ProjectListCreateView(generics.ListCreateAPIView):
    def get_queryset(self):
        user = self.request.user
        if not user.company:
            return Project.objects.none()
        return Project.objects.filter(company=user.company).prefetch_related("floors")

    def get_serializer_class(self):
        if self.request.method == "POST":
            return ProjectCreateSerializer
        return ProjectSerializer

    def perform_create(self, serializer):
        serializer.save(company=self.request.user.company, created_by=self.request.user)


class ProjectDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = ProjectSerializer

    def get_queryset(self):
        user = self.request.user
        if not user.company:
            return Project.objects.none()
        return Project.objects.filter(company=user.company).prefetch_related("floors")


class ProjectRequirementsView(APIView):
    def get_project(self, project_id):
        return Project.objects.get(id=project_id, company=self.request.user.company)

    def get(self, request, project_id):
        try:
            project = self.get_project(project_id)
        except Project.DoesNotExist:
            return Response({"detail": "Proje bulunamadı."}, status=status.HTTP_404_NOT_FOUND)

        requirements = project.requirements.all()
        return Response(RebarRequirementSerializer(requirements, many=True).data)

    def post(self, request, project_id):
        if not request.user.company:
            return Response(
                {"detail": "Şirket bilgisi gerekli."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            project = self.get_project(project_id)
        except Project.DoesNotExist:
            return Response({"detail": "Proje bulunamadı."}, status=status.HTTP_404_NOT_FOUND)

        serializer = RebarRequirementCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        floor = None
        floor_name = data.get("floor_name", "").strip()
        if floor_name:
            floor, _ = Floor.objects.get_or_create(
                project=project,
                name=floor_name,
                defaults={"order": project.floors.count()},
            )

        requirement = RebarRequirement.objects.create(
            project=project,
            floor=floor,
            diameter_mm=data["diameter_mm"],
            length_m=data["length_m"],
            quantity=data.get("quantity", 1),
            element_ref=data.get("element_ref", ""),
            notes=data.get("notes", ""),
        )
        return Response(
            RebarRequirementSerializer(requirement).data,
            status=status.HTTP_201_CREATED,
        )


class ProjectOptimizeView(APIView):
    def post(self, request, project_id):
        if not request.user.company:
            return Response(
                {"detail": "Şirket bilgisi gerekli."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            project = Project.objects.get(id=project_id, company=request.user.company)
        except Project.DoesNotExist:
            return Response({"detail": "Proje bulunamadı."}, status=status.HTTP_404_NOT_FOUND)

        requirements = list(
            project.requirements.values("diameter_mm", "length_m", "quantity", "element_ref")
        )
        if not requirements:
            return Response(
                {"detail": "Optimizasyon için demir girişi bulunamadı."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        run = OptimizationRun.objects.create(project=project)

        try:
            result = optimize_cutting_stock(requirements)
            run.waste_percent = result.get("waste_percent", 0)
            run.save(update_fields=["waste_percent"])
            return Response(
                {
                    "run": OptimizationRunSerializer(run).data,
                    "result": result,
                }
            )
        except NotImplementedError as exc:
            return Response(
                {
                    "detail": str(exc),
                    "run_id": run.id,
                    "requirements_count": len(requirements),
                },
                status=status.HTTP_501_NOT_IMPLEMENTED,
            )
