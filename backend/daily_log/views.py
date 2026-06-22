from rest_framework import generics, status
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView

from core_backend.upload_limits import is_upload_too_large, upload_too_large_response
from sites.services import sites_for_user

from .models import Asset, DailyLog, DailyLogPhoto
from .serializers import (
    AssetCreateSerializer,
    AssetSerializer,
    DailyLogCreateSerializer,
    DailyLogPhotoSerializer,
    DailyLogSerializer,
)


def _get_site(request, site_id: int):
    return sites_for_user(request.user).filter(id=site_id).first()


class DailyLogListCreateView(generics.ListCreateAPIView):
    serializer_class = DailyLogSerializer

    def get_queryset(self):
        site_id = self.request.query_params.get("site_id")
        qs = DailyLog.objects.filter(site__in=sites_for_user(self.request.user)).prefetch_related(
            "photos"
        ).select_related("created_by")
        if site_id:
            qs = qs.filter(site_id=site_id)
        return qs

    def get_serializer_class(self):
        if self.request.method == "POST":
            return DailyLogCreateSerializer
        return DailyLogSerializer

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx["request"] = self.request
        return ctx

    def list(self, request, *args, **kwargs):
        if not request.query_params.get("site_id"):
            return Response({"detail": "site_id gerekli."}, status=status.HTTP_400_BAD_REQUEST)
        return super().list(request, *args, **kwargs)

    def create(self, request, *args, **kwargs):
        site_id = request.data.get("site_id")
        if not site_id:
            return Response({"detail": "site_id gerekli."}, status=status.HTTP_400_BAD_REQUEST)
        site = _get_site(request, int(site_id))
        if not site:
            return Response({"detail": "Şantiye bulunamadı."}, status=status.HTTP_404_NOT_FOUND)
        serializer = DailyLogCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        log = DailyLog.objects.create(
            site=site,
            created_by=request.user,
            **serializer.validated_data,
        )
        return Response(
            DailyLogSerializer(log, context={"request": request}).data,
            status=status.HTTP_201_CREATED,
        )


class DailyLogTodayView(APIView):
    def get(self, request):
        site_id = request.query_params.get("site_id")
        if not site_id:
            return Response({"detail": "site_id gerekli."}, status=status.HTTP_400_BAD_REQUEST)
        site = _get_site(request, int(site_id))
        if not site:
            return Response({"detail": "Şantiye bulunamadı."}, status=status.HTTP_404_NOT_FOUND)

        from .services.draft import get_or_create_daily_log

        log = get_or_create_daily_log(site, request.user)
        return Response(DailyLogSerializer(log, context={"request": request}).data)


class DailyLogDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = DailyLogSerializer

    def get_queryset(self):
        return DailyLog.objects.filter(site__in=sites_for_user(self.request.user)).prefetch_related(
            "photos"
        )

    def get_serializer_class(self):
        if self.request.method in ("PUT", "PATCH"):
            return DailyLogCreateSerializer
        return DailyLogSerializer

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx["request"] = self.request
        return ctx


class DailyLogPhotoUploadView(APIView):
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request, pk: int):
        log = DailyLog.objects.filter(
            pk=pk, site__in=sites_for_user(request.user)
        ).first()
        if not log:
            return Response({"detail": "Kayıt bulunamadı."}, status=status.HTTP_404_NOT_FOUND)
        image = request.FILES.get("image")
        if not image:
            return Response({"detail": "image gerekli."}, status=status.HTTP_400_BAD_REQUEST)
        if is_upload_too_large(image):
            return upload_too_large_response()
        photo = DailyLogPhoto.objects.create(
            daily_log=log,
            image=image,
            caption=request.data.get("caption", ""),
        )
        return Response(
            DailyLogPhotoSerializer(photo, context={"request": request}).data,
            status=status.HTTP_201_CREATED,
        )


class AssetListCreateView(generics.ListCreateAPIView):
    serializer_class = AssetSerializer

    def get_queryset(self):
        site_id = self.request.query_params.get("site_id")
        qs = Asset.objects.filter(site__in=sites_for_user(self.request.user))
        if site_id:
            qs = qs.filter(site_id=site_id)
        return qs

    def get_serializer_class(self):
        if self.request.method == "POST":
            return AssetCreateSerializer
        return AssetSerializer

    def list(self, request, *args, **kwargs):
        if not request.query_params.get("site_id"):
            return Response({"detail": "site_id gerekli."}, status=status.HTTP_400_BAD_REQUEST)
        return super().list(request, *args, **kwargs)

    def create(self, request, *args, **kwargs):
        site_id = request.data.get("site_id")
        if not site_id:
            return Response({"detail": "site_id gerekli."}, status=status.HTTP_400_BAD_REQUEST)
        site = _get_site(request, int(site_id))
        if not site:
            return Response({"detail": "Şantiye bulunamadı."}, status=status.HTTP_404_NOT_FOUND)
        serializer = AssetCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        asset = Asset.objects.create(site=site, **serializer.validated_data)
        return Response(AssetSerializer(asset).data, status=status.HTTP_201_CREATED)


class AssetDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = AssetSerializer

    def get_queryset(self):
        return Asset.objects.filter(site__in=sites_for_user(self.request.user))

    def get_serializer_class(self):
        if self.request.method in ("PUT", "PATCH"):
            return AssetCreateSerializer
        return AssetSerializer
