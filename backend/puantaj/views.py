from django.db.models import Count, Q
from django.utils import timezone
from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.views import APIView

from sites.services import sites_for_user

from .models import (
    AdvancePayment,
    HakedisPeriod,
    HakedisPeriodSubcontractorDeduction,
    Subcontractor,
    SubcontractorContract,
    Timesheet,
    Worker,
)
from .permissions import (
    can_approve_hakedis_period,
    can_manage_advances,
    can_manage_contracts,
    can_manage_puantaj,
    can_prepare_hakedis_period,
)
from .serializers import (
    AdvancePaymentCreateSerializer,
    AdvancePaymentSerializer,
    HakedisPeriodCreateSerializer,
    HakedisPeriodDeductionUpdateSerializer,
    HakedisPeriodSerializer,
    HakedisPeriodUpdateSerializer,
    HakedisSiteSerializer,
    HakedisSubcontractorSerializer,
    SettlementSerializer,
    SubcontractorContractCreateSerializer,
    SubcontractorContractSerializer,
    SubcontractorCreateSerializer,
    SubcontractorSerializer,
    SubcontractorUpdateSerializer,
    TimesheetCreateSerializer,
    TimesheetSerializer,
    WorkerCreateSerializer,
    WorkerSerializer,
    WorkerUpdateSerializer,
)
from .services.hakedis import hakedis_for_site, hakedis_for_subcontractor
from .services.hakedis_period import (
    approve_period,
    calculate_period_lines,
    delete_hakedis_period,
    recalculate_period_totals,
    submit_period,
    update_locked_period,
)
from .services.settlement import settlement_for_site


def _get_site_or_403(request, site_id: int):
    return sites_for_user(request.user).filter(id=site_id).first()


def _deny():
    return Response({"detail": "Bu işlem için yetkiniz yok."}, status=status.HTTP_403_FORBIDDEN)


class SubcontractorListCreateView(generics.ListCreateAPIView):
    def get_queryset(self):
        site_id = self.request.query_params.get("site_id")
        accessible = sites_for_user(self.request.user)
        qs = Subcontractor.objects.filter(site__in=accessible).annotate(
            timesheet_count=Count("timesheets"),
            metraj_item_count=Count("metraj_items"),
        )
        if site_id:
            qs = qs.filter(site_id=site_id)
        return qs.select_related("site", "category")

    def get_serializer_class(self):
        if self.request.method == "POST":
            return SubcontractorCreateSerializer
        return SubcontractorSerializer

    def create(self, request, *args, **kwargs):
        site_id = request.data.get("site_id")
        if not site_id:
            return Response({"detail": "site_id gerekli."}, status=status.HTTP_400_BAD_REQUEST)
        site = _get_site_or_403(request, int(site_id))
        if not site:
            return Response({"detail": "Şantiye bulunamadı."}, status=status.HTTP_404_NOT_FOUND)

        serializer = SubcontractorCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        sub = Subcontractor.objects.create(
            site=site,
            **{k: v for k, v in serializer.validated_data.items() if k != "site_id"},
        )
        SubcontractorContract.objects.get_or_create(
            subcontractor=sub,
            status=SubcontractorContract.Status.ACTIVE,
            defaults={"retainage_percent": 0, "total_amount": 0},
        )
        from finans.services.ledger_sync import get_or_create_vendor_for_subcontractor

        get_or_create_vendor_for_subcontractor(sub)
        return Response(SubcontractorSerializer(sub).data, status=status.HTTP_201_CREATED)


class WorkerListCreateView(generics.ListCreateAPIView):
    def get_queryset(self):
        site_id = self.request.query_params.get("site_id")
        accessible = sites_for_user(self.request.user)
        qs = Worker.objects.filter(
            Q(subcontractor__site__in=accessible)
            | Q(site__in=accessible, employment_type=Worker.EmploymentType.DIRECT)
        ).select_related("subcontractor", "site")
        if site_id:
            qs = qs.filter(
                Q(subcontractor__site_id=site_id)
                | Q(site_id=site_id, employment_type=Worker.EmploymentType.DIRECT)
            )
        subcontractor_id = self.request.query_params.get("subcontractor_id")
        if subcontractor_id:
            qs = qs.filter(
                subcontractor_id=subcontractor_id,
                employment_type=Worker.EmploymentType.SUBCONTRACTOR,
            )
        employment_type = self.request.query_params.get("employment_type")
        if employment_type in (Worker.EmploymentType.SUBCONTRACTOR, Worker.EmploymentType.DIRECT):
            qs = qs.filter(employment_type=employment_type)
        return qs

    def get_serializer_class(self):
        if self.request.method == "POST":
            return WorkerCreateSerializer
        return WorkerSerializer

    def create(self, request, *args, **kwargs):
        if not can_manage_puantaj(request.user):
            return _deny()
        site_id = request.data.get("site_id")
        if not site_id:
            return Response({"detail": "site_id gerekli."}, status=status.HTTP_400_BAD_REQUEST)
        site = _get_site_or_403(request, int(site_id))
        if not site:
            return Response({"detail": "Şantiye bulunamadı."}, status=status.HTTP_404_NOT_FOUND)

        serializer = WorkerCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = {k: v for k, v in serializer.validated_data.items() if k != "site_id"}
        if data.get("employment_type", Worker.EmploymentType.SUBCONTRACTOR) == Worker.EmploymentType.DIRECT:
            data["site"] = site
        worker = Worker.objects.create(**data)
        return Response(WorkerSerializer(worker).data, status=status.HTTP_201_CREATED)


class WorkerDetailView(generics.RetrieveUpdateDestroyAPIView):
    def get_serializer_class(self):
        if self.request.method in ("PUT", "PATCH"):
            return WorkerUpdateSerializer
        return WorkerSerializer

    def get_queryset(self):
        accessible = sites_for_user(self.request.user)
        return Worker.objects.filter(
            Q(subcontractor__site__in=accessible)
            | Q(site__in=accessible, employment_type=Worker.EmploymentType.DIRECT)
        ).select_related("subcontractor", "site")

    def update(self, request, *args, **kwargs):
        if not can_manage_puantaj(request.user):
            return _deny()
        return super().update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        if not can_manage_puantaj(request.user):
            return _deny()
        return super().destroy(request, *args, **kwargs)


class SubcontractorDetailView(generics.RetrieveUpdateDestroyAPIView):
    def get_serializer_class(self):
        if self.request.method in ("PUT", "PATCH"):
            return SubcontractorUpdateSerializer
        return SubcontractorSerializer

    def get_queryset(self):
        accessible = sites_for_user(self.request.user)
        return Subcontractor.objects.filter(site__in=accessible).annotate(
            timesheet_count=Count("timesheets"),
            metraj_item_count=Count("metraj_items"),
        ).select_related("site", "category")

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop("partial", False)
        instance = self.get_object()
        serializer = SubcontractorUpdateSerializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        sub = self.get_queryset().get(pk=instance.pk)
        return Response(SubcontractorSerializer(sub).data)


class SubcontractorContractListCreateView(generics.ListCreateAPIView):
    def get_queryset(self):
        site_id = self.request.query_params.get("site_id")
        accessible = sites_for_user(self.request.user)
        qs = SubcontractorContract.objects.filter(
            subcontractor__site__in=accessible
        ).select_related("subcontractor")
        if site_id:
            qs = qs.filter(subcontractor__site_id=site_id)
        subcontractor_id = self.request.query_params.get("subcontractor_id")
        if subcontractor_id:
            qs = qs.filter(subcontractor_id=subcontractor_id)
        return qs

    def get_serializer_class(self):
        if self.request.method == "POST":
            return SubcontractorContractCreateSerializer
        return SubcontractorContractSerializer

    def create(self, request, *args, **kwargs):
        if not can_manage_contracts(request.user):
            return _deny()
        site_id = request.data.get("site_id")
        if not site_id:
            return Response({"detail": "site_id gerekli."}, status=status.HTTP_400_BAD_REQUEST)
        site = _get_site_or_403(request, int(site_id))
        if not site:
            return Response({"detail": "Şantiye bulunamadı."}, status=status.HTTP_404_NOT_FOUND)
        serializer = SubcontractorContractCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        contract = SubcontractorContract.objects.create(
            **{k: v for k, v in serializer.validated_data.items() if k != "site_id"},
        )
        return Response(
            SubcontractorContractSerializer(contract).data,
            status=status.HTTP_201_CREATED,
        )


class SubcontractorContractDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = SubcontractorContractSerializer

    def get_queryset(self):
        accessible = sites_for_user(self.request.user)
        return SubcontractorContract.objects.filter(subcontractor__site__in=accessible)


class AdvancePaymentListCreateView(generics.ListCreateAPIView):
    def get_queryset(self):
        site_id = self.request.query_params.get("site_id")
        accessible = sites_for_user(self.request.user)
        qs = AdvancePayment.objects.filter(site__in=accessible).select_related("subcontractor")
        if site_id:
            qs = qs.filter(site_id=site_id)
        return qs

    def get_serializer_class(self):
        if self.request.method == "POST":
            return AdvancePaymentCreateSerializer
        return AdvancePaymentSerializer

    def create(self, request, *args, **kwargs):
        if not can_manage_advances(request.user):
            return _deny()
        site_id = request.data.get("site_id")
        if not site_id:
            return Response({"detail": "site_id gerekli."}, status=status.HTTP_400_BAD_REQUEST)
        site = _get_site_or_403(request, int(site_id))
        if not site:
            return Response({"detail": "Şantiye bulunamadı."}, status=status.HTTP_404_NOT_FOUND)
        serializer = AdvancePaymentCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        adv = AdvancePayment.objects.create(
            site=site,
            subcontractor=data["subcontractor"],
            amount=data["amount"],
            payment_date=data["payment_date"],
            remaining_balance=data["amount"],
            notes=data.get("notes", ""),
        )
        return Response(AdvancePaymentSerializer(adv).data, status=status.HTTP_201_CREATED)


class AdvancePaymentDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = AdvancePaymentSerializer

    def get_queryset(self):
        accessible = sites_for_user(self.request.user)
        return AdvancePayment.objects.filter(site__in=accessible)


class HakedisPeriodListCreateView(generics.ListCreateAPIView):
    def get_queryset(self):
        site_id = self.request.query_params.get("site_id")
        year = self.request.query_params.get("year")
        month = self.request.query_params.get("month")
        accessible = sites_for_user(self.request.user)
        qs = HakedisPeriod.objects.filter(site__in=accessible).prefetch_related(
            "lines", "subcontractor_deductions"
        )
        if site_id:
            qs = qs.filter(site_id=site_id)
        if year:
            qs = qs.filter(period_end__year=int(year))
        if month:
            qs = qs.filter(period_end__month=int(month))
        return qs.select_related("prepared_by", "approved_by")

    def get_serializer_class(self):
        if self.request.method == "POST":
            return HakedisPeriodCreateSerializer
        return HakedisPeriodSerializer

    def create(self, request, *args, **kwargs):
        if not can_prepare_hakedis_period(request.user):
            return _deny()
        site_id = request.data.get("site_id")
        if not site_id:
            return Response({"detail": "site_id gerekli."}, status=status.HTTP_400_BAD_REQUEST)
        site = _get_site_or_403(request, int(site_id))
        if not site:
            return Response({"detail": "Şantiye bulunamadı."}, status=status.HTTP_404_NOT_FOUND)
        serializer = HakedisPeriodCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        period = HakedisPeriod.objects.create(
            site=site,
            prepared_by=request.user,
            period_start=serializer.validated_data["period_start"],
            period_end=serializer.validated_data["period_end"],
            notes=serializer.validated_data.get("notes", ""),
        )
        calculate_period_lines(period)
        return Response(
            HakedisPeriodSerializer(period).data,
            status=status.HTTP_201_CREATED,
        )


class HakedisPeriodDetailView(generics.RetrieveUpdateDestroyAPIView):
    def get_serializer_class(self):
        if self.request.method in ("PUT", "PATCH"):
            return HakedisPeriodUpdateSerializer
        return HakedisPeriodSerializer

    def get_queryset(self):
        accessible = sites_for_user(self.request.user)
        return HakedisPeriod.objects.filter(site__in=accessible).prefetch_related(
            "lines__metraj_item__category",
            "lines__subcontractor",
            "subcontractor_deductions__subcontractor",
        )

    def update(self, request, *args, **kwargs):
        period = self.get_object()
        if period.status == HakedisPeriod.Status.PAID:
            return Response({"detail": "Ödenmiş dönem düzenlenemez."}, status=status.HTTP_400_BAD_REQUEST)
        if period.is_locked:
            if not can_approve_hakedis_period(request.user):
                return _deny()
            serializer = HakedisPeriodUpdateSerializer(period, data=request.data, partial=True)
            serializer.is_valid(raise_exception=True)
            try:
                update_locked_period(period, request.user, **serializer.validated_data)
            except ValueError as exc:
                return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
            period.refresh_from_db()
            return Response(HakedisPeriodSerializer(period).data)
        if not can_prepare_hakedis_period(request.user):
            return _deny()
        return super().update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        period = self.get_object()
        if period.status == HakedisPeriod.Status.PAID:
            return Response({"detail": "Ödenmiş dönem silinemez."}, status=status.HTTP_400_BAD_REQUEST)
        if period.is_locked:
            if not can_approve_hakedis_period(request.user):
                return _deny()
            try:
                delete_hakedis_period(period)
            except ValueError as exc:
                return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
            return Response(status=status.HTTP_204_NO_CONTENT)
        if not can_prepare_hakedis_period(request.user):
            return _deny()
        return super().destroy(request, *args, **kwargs)


class HakedisPeriodCalculateView(APIView):
    def post(self, request, pk: int):
        if not can_prepare_hakedis_period(request.user):
            return _deny()
        accessible = sites_for_user(request.user)
        period = HakedisPeriod.objects.filter(pk=pk, site__in=accessible).first()
        if not period:
            return Response({"detail": "Dönem bulunamadı."}, status=status.HTTP_404_NOT_FOUND)
        try:
            calculate_period_lines(period)
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        period.refresh_from_db()
        return Response(HakedisPeriodSerializer(period).data)


class HakedisPeriodSubmitView(APIView):
    def post(self, request, pk: int):
        if not can_prepare_hakedis_period(request.user):
            return _deny()
        accessible = sites_for_user(request.user)
        period = HakedisPeriod.objects.filter(pk=pk, site__in=accessible).first()
        if not period:
            return Response({"detail": "Dönem bulunamadı."}, status=status.HTTP_404_NOT_FOUND)
        try:
            submit_period(period, request.user)
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        period.refresh_from_db()
        return Response(HakedisPeriodSerializer(period).data)


class HakedisPeriodApproveView(APIView):
    def post(self, request, pk: int):
        if not can_approve_hakedis_period(request.user):
            return _deny()
        accessible = sites_for_user(request.user)
        period = HakedisPeriod.objects.filter(pk=pk, site__in=accessible).first()
        if not period:
            return Response({"detail": "Dönem bulunamadı."}, status=status.HTTP_404_NOT_FOUND)
        try:
            approve_period(period, request.user)
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        period.refresh_from_db()
        return Response(HakedisPeriodSerializer(period).data)


class HakedisPeriodDeductionDetailView(generics.RetrieveUpdateAPIView):
    serializer_class = HakedisPeriodDeductionUpdateSerializer

    def get_queryset(self):
        accessible = sites_for_user(self.request.user)
        return HakedisPeriodSubcontractorDeduction.objects.filter(
            period__site__in=accessible
        ).select_related("period")

    def update(self, request, *args, **kwargs):
        deduction = self.get_object()
        period = deduction.period
        if period.status == HakedisPeriod.Status.PAID:
            return Response({"detail": "Ödenmiş dönem düzenlenemez."}, status=status.HTTP_400_BAD_REQUEST)
        if period.is_locked:
            if not can_approve_hakedis_period(request.user):
                return _deny()
            response = super().update(request, *args, **kwargs)
            recalculate_period_totals(period, allow_locked=True)
            from finans.services.ledger_sync import resync_hakedis_period_to_ledger

            resync_hakedis_period_to_ledger(period, request.user)
            return response
        response = super().update(request, *args, **kwargs)
        recalculate_period_totals(deduction.period)
        return response


class TimesheetListCreateView(generics.ListCreateAPIView):
    def get_queryset(self):
        site_id = self.request.query_params.get("site_id")
        month = self.request.query_params.get("month")
        year = self.request.query_params.get("year")
        accessible = sites_for_user(self.request.user)
        qs = Timesheet.objects.filter(site__in=accessible).select_related(
            "subcontractor",
            "worker",
            "created_by",
            "approved_by",
        )
        if site_id:
            qs = qs.filter(site_id=site_id)
        if year:
            qs = qs.filter(date__year=int(year))
        if month:
            qs = qs.filter(date__month=int(month))
        return qs

    def get_serializer_class(self):
        if self.request.method == "POST":
            return TimesheetCreateSerializer
        return TimesheetSerializer

    def create(self, request, *args, **kwargs):
        if not can_manage_puantaj(request.user):
            return _deny()
        site_id = request.data.get("site_id")
        if not site_id:
            return Response({"detail": "site_id gerekli."}, status=status.HTTP_400_BAD_REQUEST)
        site = _get_site_or_403(request, int(site_id))
        if not site:
            return Response({"detail": "Şantiye bulunamadı."}, status=status.HTTP_404_NOT_FOUND)

        serializer = TimesheetCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        worker = data.get("worker")
        if worker:
            if Timesheet.objects.filter(worker=worker, date=data["date"]).exists():
                return Response(
                    {"detail": "Bu işçi için seçilen günde zaten puantaj var."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
        elif Timesheet.objects.filter(
            subcontractor=data["subcontractor"],
            date=data["date"],
            worker__isnull=True,
        ).exists():
            return Response(
                {"detail": "Bu taşeron için seçilen günde zaten puantaj var."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        entry = Timesheet.objects.create(
            site=site,
            created_by=request.user,
            subcontractor=data["subcontractor"],
            worker=worker,
            date=data["date"],
            worker_count=1 if worker else data.get("worker_count", 1),
            notes=data.get("notes", ""),
        )
        return Response(
            TimesheetSerializer(entry).data,
            status=status.HTTP_201_CREATED,
        )


class TimesheetDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = TimesheetSerializer

    def get_queryset(self):
        accessible = sites_for_user(self.request.user)
        return Timesheet.objects.filter(site__in=accessible).select_related(
            "subcontractor",
            "created_by",
            "approved_by",
        )

    def update(self, request, *args, **kwargs):
        if not can_manage_puantaj(request.user):
            return _deny()
        return super().update(request, *args, **kwargs)


class TimesheetApproveView(APIView):
    def post(self, request, pk: int):
        if not can_manage_puantaj(request.user):
            return _deny()
        accessible = sites_for_user(request.user)
        entry = Timesheet.objects.filter(pk=pk, site__in=accessible).first()
        if not entry:
            return Response({"detail": "Puantaj bulunamadı."}, status=status.HTTP_404_NOT_FOUND)
        entry.status = Timesheet.Status.APPROVED
        entry.approved_by = request.user
        entry.approved_at = timezone.now()
        entry.save(update_fields=["status", "approved_by", "approved_at", "updated_at"])
        return Response(TimesheetSerializer(entry).data)


class SettlementView(APIView):
    def get(self, request):
        site_id = request.query_params.get("site_id")
        year = request.query_params.get("year")
        month = request.query_params.get("month")
        if not site_id or not year or not month:
            return Response(
                {"detail": "site_id, year ve month gerekli."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        site = _get_site_or_403(request, int(site_id))
        if not site:
            return Response({"detail": "Şantiye bulunamadı."}, status=status.HTTP_404_NOT_FOUND)

        data = settlement_for_site(site.id, int(year), int(month))
        return Response(SettlementSerializer(data).data)


class HakedisSiteView(APIView):
    def get(self, request):
        site_id = request.query_params.get("site_id")
        if not site_id:
            return Response({"detail": "site_id gerekli."}, status=status.HTTP_400_BAD_REQUEST)
        site = _get_site_or_403(request, int(site_id))
        if not site:
            return Response({"detail": "Şantiye bulunamadı."}, status=status.HTTP_404_NOT_FOUND)

        data = hakedis_for_site(site.id)
        data["is_estimate"] = True
        return Response(HakedisSiteSerializer(data).data)


class HakedisSubcontractorView(APIView):
    def get(self, request, pk: int):
        accessible = sites_for_user(request.user)
        sub = Subcontractor.objects.filter(pk=pk, site__in=accessible).first()
        if not sub:
            return Response({"detail": "Taşeron bulunamadı."}, status=status.HTTP_404_NOT_FOUND)

        data = hakedis_for_subcontractor(sub.id)
        return Response(HakedisSubcontractorSerializer(data).data)
