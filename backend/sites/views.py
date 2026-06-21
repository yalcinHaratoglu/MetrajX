from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.views import APIView

from django.db.models import Avg, Count

from authentication.models import CustomUser

from .models import Site
from .serializers import SiteCreateSerializer, SiteSerializer
from .services import sites_for_user


def _sites_queryset(user):
    return (
        sites_for_user(user)
        .select_related("rebar_project")
        .prefetch_related("memberships__user")
        .annotate(
            metraj_item_count=Count("metraj_items"),
            metraj_average_progress=Avg("metraj_items__completion_percent"),
        )
    )


class SiteListCreateView(generics.ListCreateAPIView):
    def get_queryset(self):
        return _sites_queryset(self.request.user)

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
        serializer = self.get_serializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        site = _sites_queryset(request.user).get(pk=serializer.instance.pk)
        return Response(SiteSerializer(site).data, status=status.HTTP_201_CREATED)


class SiteDetailView(generics.RetrieveUpdateDestroyAPIView):
    def get_serializer_class(self):
        if self.request.method in ("PUT", "PATCH"):
            return SiteCreateSerializer
        return SiteSerializer

    def get_queryset(self):
        return _sites_queryset(self.request.user)

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop("partial", False)
        instance = self.get_object()
        serializer = self.get_serializer(
            instance,
            data=request.data,
            partial=partial,
            context={"request": request},
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        site = _sites_queryset(request.user).get(pk=instance.pk)
        return Response(SiteSerializer(site).data)

    def destroy(self, request, *args, **kwargs):
        if request.user.role != CustomUser.Role.OWNER:
            return Response(
                {"detail": "Şantiye silme yetkiniz yalnızca yöneticiye aittir."},
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
