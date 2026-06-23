from datetime import date, timedelta

from django.utils import timezone
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from sites.services import sites_for_user

from .models import Worker
from .permissions import can_manage_puantaj
from .services.workers import worker_belongs_to_site
from .services.attendance import attendance_matrix, export_attendance_xlsx, toggle_attendance


def _parse_date(value: str | None) -> date | None:
    if not value:
        return None
    try:
        return date.fromisoformat(value)
    except ValueError:
        return None


def _default_month_bounds() -> tuple[date, date]:
    today = timezone.localdate()
    date_from = date(today.year, today.month, 1)
    if today.month == 12:
        date_to = date(today.year, 12, 31)
    else:
        date_to = date(today.year, today.month + 1, 1) - timedelta(days=1)
    return date_from, date_to


class AttendanceMatrixView(APIView):
    def get(self, request):
        site_id = request.query_params.get("site_id")
        if not site_id:
            return Response({"detail": "site_id gerekli."}, status=status.HTTP_400_BAD_REQUEST)
        site = sites_for_user(request.user).filter(id=int(site_id)).first()
        if not site:
            return Response({"detail": "Şantiye bulunamadı."}, status=status.HTTP_404_NOT_FOUND)

        date_from = _parse_date(request.query_params.get("date_from"))
        date_to = _parse_date(request.query_params.get("date_to"))
        if not date_from or not date_to:
            date_from, date_to = _default_month_bounds()

        subcontractor_id = request.query_params.get("subcontractor_id")
        search = request.query_params.get("search", "")
        sub_id = int(subcontractor_id) if subcontractor_id else None

        employment_type = request.query_params.get("employment_type")
        if employment_type not in (Worker.EmploymentType.SUBCONTRACTOR, Worker.EmploymentType.DIRECT):
            employment_type = None

        if request.query_params.get("export") == "xlsx":
            return export_attendance_xlsx(
                site.id,
                date_from,
                date_to,
                subcontractor_id=sub_id,
                employment_type=employment_type,
                search=search,
            )

        return Response(
            attendance_matrix(
                site.id,
                date_from,
                date_to,
                subcontractor_id=sub_id,
                employment_type=employment_type,
                search=search,
            )
        )


class AttendanceToggleView(APIView):
    def post(self, request):
        if not can_manage_puantaj(request.user):
            return Response({"detail": "Yetkiniz yok."}, status=status.HTTP_403_FORBIDDEN)

        site_id = request.data.get("site_id")
        worker_id = request.data.get("worker_id")
        day = _parse_date(request.data.get("date"))
        present = bool(request.data.get("present"))

        if not site_id or not worker_id or not day:
            return Response({"detail": "site_id, worker_id, date gerekli."}, status=status.HTTP_400_BAD_REQUEST)

        site = sites_for_user(request.user).filter(id=int(site_id)).first()
        if not site:
            return Response({"detail": "Şantiye bulunamadı."}, status=status.HTTP_404_NOT_FOUND)

        if not worker_belongs_to_site(int(worker_id), site.id):
            return Response({"detail": "İşçi bulunamadı."}, status=status.HTTP_404_NOT_FOUND)

        try:
            toggle_attendance(int(site_id), int(worker_id), day, present, request.user)
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        return Response({"ok": True})
