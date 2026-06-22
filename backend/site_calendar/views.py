from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.views import APIView

from metraj.models import MetrajOperation
from metraj.serializers import MetrajOperationSerializer
from sites.services import sites_for_user

from .models import CalendarEvent
from .serializers import (
    CalendarEventCreateSerializer,
    CalendarEventSerializer,
)


def _get_site(request, site_id: int):
    return sites_for_user(request.user).filter(id=site_id).first()


class CalendarEventListCreateView(generics.ListCreateAPIView):
    serializer_class = CalendarEventSerializer

    def get_queryset(self):
        site_id = self.request.query_params.get("site_id")
        qs = CalendarEvent.objects.filter(site__in=sites_for_user(self.request.user))
        if site_id:
            qs = qs.filter(site_id=site_id)
        return qs

    def get_serializer_class(self):
        if self.request.method == "POST":
            return CalendarEventCreateSerializer
        return CalendarEventSerializer

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
        serializer = CalendarEventCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        event = CalendarEvent.objects.create(
            site=site,
            created_by=request.user,
            **serializer.validated_data,
        )
        return Response(
            CalendarEventSerializer(event).data, status=status.HTTP_201_CREATED
        )


class CalendarEventDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = CalendarEventSerializer

    def get_queryset(self):
        return CalendarEvent.objects.filter(site__in=sites_for_user(self.request.user))

    def get_serializer_class(self):
        if self.request.method in ("PUT", "PATCH"):
            return CalendarEventCreateSerializer
        return CalendarEventSerializer


class UnifiedCalendarView(APIView):
    """Metraj operasyonları + bağımsız takvim olayları."""

    def get(self, request):
        site_id = request.query_params.get("site_id")
        if not site_id:
            return Response({"detail": "site_id gerekli."}, status=status.HTTP_400_BAD_REQUEST)
        site = _get_site(request, int(site_id))
        if not site:
            return Response({"detail": "Şantiye bulunamadı."}, status=status.HTTP_404_NOT_FOUND)

        operations = MetrajOperation.objects.filter(item__site=site).select_related(
            "item", "item__category"
        )
        events = CalendarEvent.objects.filter(site=site)
        return Response(
            {
                "operations": MetrajOperationSerializer(
                    operations, many=True, context={"request": request}
                ).data,
                "events": CalendarEventSerializer(events, many=True).data,
            }
        )
