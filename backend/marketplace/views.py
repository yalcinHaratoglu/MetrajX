from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from sites.services import sites_for_user

from .models import AppDefinition, SiteAppInstallation
from .permissions import can_manage_site_installation
from .serializers import (
    AppCatalogEntrySerializer,
    InstallAppSerializer,
    SiteAppInstallationSerializer,
)
from .services import catalog_for_site, install_app_for_site, installed_apps_for_site, uninstall_app


def _get_site_or_404(request, site_id: int):
    return sites_for_user(request.user).filter(id=site_id).first()


class AppCatalogView(APIView):
    """Şantiye bazlı uygulama kataloğu (kurulum durumu dahil)."""

    def get(self, request):
        site_id = request.query_params.get("site_id")
        if not site_id:
            return Response({"detail": "site_id gerekli."}, status=status.HTTP_400_BAD_REQUEST)
        site = _get_site_or_404(request, int(site_id))
        if not site:
            return Response({"detail": "Şantiye bulunamadı."}, status=status.HTTP_404_NOT_FOUND)
        data = catalog_for_site(site)
        serializer = AppCatalogEntrySerializer(data, many=True)
        return Response(serializer.data)


class SiteAppInstallationListView(APIView):
    """Şantiyede kurulu uygulamalar (sidebar için)."""

    def get(self, request):
        site_id = request.query_params.get("site_id")
        if not site_id:
            return Response({"detail": "site_id gerekli."}, status=status.HTTP_400_BAD_REQUEST)
        site = _get_site_or_404(request, int(site_id))
        if not site:
            return Response({"detail": "Şantiye bulunamadı."}, status=status.HTTP_404_NOT_FOUND)
        installations = installed_apps_for_site(site)
        serializer = SiteAppInstallationSerializer(installations, many=True)
        return Response(serializer.data)


class SiteAppInstallationCreateView(APIView):
    def post(self, request):
        serializer = InstallAppSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        site_id = serializer.validated_data["site_id"]
        app_slug = serializer.validated_data["app_slug"]

        site = _get_site_or_404(request, site_id)
        if not site:
            return Response({"detail": "Şantiye bulunamadı."}, status=status.HTTP_404_NOT_FOUND)
        if not can_manage_site_installation(request.user, site):
            return Response({"detail": "Bu işlem için yetkiniz yok."}, status=status.HTTP_403_FORBIDDEN)

        app = AppDefinition.objects.filter(slug=app_slug, is_active=True).first()
        if not app:
            return Response({"detail": "Uygulama bulunamadı."}, status=status.HTTP_404_NOT_FOUND)
        if not app.is_installable:
            return Response(
                {"detail": "Bu uygulama henüz kurulabilir değil."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        installation = install_app_for_site(site, app, request.user)
        return Response(
            SiteAppInstallationSerializer(installation).data,
            status=status.HTTP_201_CREATED,
        )


class SiteAppInstallationDeleteView(APIView):
    def delete(self, request, pk: int):
        installation = (
            SiteAppInstallation.objects.filter(pk=pk)
            .select_related("site", "app")
            .first()
        )
        if not installation:
            return Response({"detail": "Kurulum bulunamadı."}, status=status.HTTP_404_NOT_FOUND)
        if not sites_for_user(request.user).filter(id=installation.site_id).exists():
            return Response({"detail": "Şantiye bulunamadı."}, status=status.HTTP_404_NOT_FOUND)
        if not can_manage_site_installation(request.user, installation.site):
            return Response({"detail": "Bu işlem için yetkiniz yok."}, status=status.HTTP_403_FORBIDDEN)

        uninstall_app(installation)
        return Response(status=status.HTTP_204_NO_CONTENT)
