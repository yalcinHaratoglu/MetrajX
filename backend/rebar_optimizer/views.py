from django.http import HttpResponse
from rest_framework import generics, status
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Floor, Project, RebarRequirement
from .serializers import (
    ProjectCreateSerializer,
    ProjectSerializer,
    RebarRequirementCreateSerializer,
    RebarRequirementSerializer,
)
from .services import OptimizerService


def _get_project_or_none(request, project_id):
    if not getattr(request.user, "company", None):
        return None
    return Project.objects.filter(id=project_id, company=request.user.company).first()


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
    def get(self, request, project_id):
        project = _get_project_or_none(request, project_id)
        if not project:
            return Response({"detail": "Proje bulunamadı."}, status=status.HTTP_404_NOT_FOUND)
        requirements = project.requirements.all()
        return Response(RebarRequirementSerializer(requirements, many=True).data)

    def post(self, request, project_id):
        if not request.user.company:
            return Response(
                {"detail": "Şirket bilgisi gerekli."}, status=status.HTTP_400_BAD_REQUEST
            )
        project = _get_project_or_none(request, project_id)
        if not project:
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
            RebarRequirementSerializer(requirement).data, status=status.HTTP_201_CREATED
        )


class RequirementDetailView(APIView):
    def delete(self, request, pk):
        if not request.user.company:
            return Response(
                {"detail": "Şirket bilgisi gerekli."}, status=status.HTTP_400_BAD_REQUEST
            )
        requirement = RebarRequirement.objects.filter(
            id=pk, project__company=request.user.company
        ).first()
        if not requirement:
            return Response({"detail": "Kalem bulunamadı."}, status=status.HTTP_404_NOT_FOUND)
        requirement.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class ProjectUploadView(APIView):
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request, project_id):
        project = _get_project_or_none(request, project_id)
        if not project:
            return Response({"detail": "Proje bulunamadı."}, status=status.HTTP_404_NOT_FOUND)

        uploaded = request.FILES.get("file")
        if not uploaded:
            return Response(
                {"detail": "Dosya gönderilmedi."}, status=status.HTTP_400_BAD_REQUEST
            )

        try:
            rows = OptimizerService.import_from_file(project, uploaded, uploaded.name)
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as exc:  # noqa: BLE001 — parse hatasını kullanıcıya bildir
            return Response(
                {"detail": f"Dosya işlenemedi: {exc}"}, status=status.HTTP_400_BAD_REQUEST
            )

        if not rows:
            return Response(
                {"detail": "Dosyada donatı verisi bulunamadı.", "imported": 0},
                status=status.HTTP_422_UNPROCESSABLE_ENTITY,
            )

        return Response(
            {
                "imported": len(rows),
                "requirements": RebarRequirementSerializer(
                    project.requirements.all(), many=True
                ).data,
            },
            status=status.HTTP_201_CREATED,
        )


class ProjectOptimizeView(APIView):
    def post(self, request, project_id):
        project = _get_project_or_none(request, project_id)
        if not project:
            return Response({"detail": "Proje bulunamadı."}, status=status.HTTP_404_NOT_FOUND)

        try:
            result = OptimizerService.run_optimization(project)
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        return Response(result)


class ProjectResultView(APIView):
    def get(self, request, project_id):
        project = _get_project_or_none(request, project_id)
        if not project:
            return Response({"detail": "Proje bulunamadı."}, status=status.HTTP_404_NOT_FOUND)

        result = OptimizerService.build_result(project)
        if not result:
            return Response(
                {"detail": "Henüz optimizasyon çalıştırılmadı."},
                status=status.HTTP_404_NOT_FOUND,
            )
        return Response(result)


class ProjectExportView(APIView):
    def get(self, request, project_id, fmt):
        project = _get_project_or_none(request, project_id)
        if not project:
            return Response({"detail": "Proje bulunamadı."}, status=status.HTTP_404_NOT_FOUND)

        try:
            if fmt == "excel":
                buffer = OptimizerService.export_excel(project)
                content_type = (
                    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                )
                filename = f"{project.name}-metraj.xlsx"
            elif fmt == "pdf":
                buffer = OptimizerService.export_pdf(project)
                content_type = "application/pdf"
                filename = f"{project.name}-kesim-plani.pdf"
            else:
                return Response(
                    {"detail": "Geçersiz format."}, status=status.HTTP_400_BAD_REQUEST
                )
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        response = HttpResponse(buffer.getvalue(), content_type=content_type)
        response["Content-Disposition"] = f'attachment; filename="{filename}"'
        return response


class TemplateDownloadView(APIView):
    def get(self, request):
        buffer = OptimizerService.build_template()
        response = HttpResponse(
            buffer.getvalue(),
            content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        )
        response["Content-Disposition"] = 'attachment; filename="metrajx-donati-sablonu.xlsx"'
        return response
