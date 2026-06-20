from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.views import APIView

from authentication.models import CustomUser

from .models import Site
from .serializers import SiteCreateSerializer, SiteSerializer
from .services import sites_for_user


class SiteListCreateView(generics.ListCreateAPIView):
    def get_queryset(self):
        return sites_for_user(self.request.user).select_related("rebar_project")

    def get_serializer_class(self):
        if self.request.method == "POST":
            return SiteCreateSerializer
        return SiteSerializer

    def perform_create(self, serializer):
        from rebar_optimizer.models import Project

        user = self.request.user
        site = serializer.save(company=user.company, created_by=user)
        Project.objects.get_or_create(
            site=site,
            defaults={
                "company": user.company,
                "created_by": user,
                "name": site.name,
            },
        )

    def create(self, request, *args, **kwargs):
        if not request.user.company:
            return Response(
                {"detail": "Şirket bilgisi gerekli."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if request.user.role not in (
            CustomUser.Role.OWNER,
            CustomUser.Role.ADMIN,
            CustomUser.Role.SITE_MANAGER,
        ):
            return Response(
                {"detail": "Şantiye oluşturma yetkiniz yok."},
                status=status.HTTP_403_FORBIDDEN,
            )
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        site = Site.objects.select_related("rebar_project").get(pk=serializer.instance.pk)
        return Response(SiteSerializer(site).data, status=status.HTTP_201_CREATED)


class SiteDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = SiteSerializer

    def get_queryset(self):
        return sites_for_user(self.request.user).select_related("rebar_project")

    def destroy(self, request, *args, **kwargs):
        if request.user.role != CustomUser.Role.OWNER:
            return Response(
                {"detail": "Şantiye silme yetkiniz yalnızca müteahhite aittir."},
                status=status.HTTP_403_FORBIDDEN,
            )
        return super().destroy(request, *args, **kwargs)


class MySitesView(APIView):
    """Giriş yapan kullanıcının erişebildiği şantiyeler (seçici için)."""

    def get(self, request):
        if not request.user.company:
            return Response([])
        sites = sites_for_user(request.user).values("id", "name", "code", "status")
        return Response(list(sites))
