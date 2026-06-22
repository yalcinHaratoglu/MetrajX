from decimal import Decimal

from django.db.models import Sum
from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.views import APIView

from sites.models import Site
from sites.services import sites_for_user

from .models import LedgerEntry, MaterialMovement, MaterialStockItem, Vendor
from .permissions import can_access_finans
from .serializers import (
    LedgerEntrySerializer,
    LedgerSummarySerializer,
    MaterialMovementCreateSerializer,
    MaterialMovementSerializer,
    MaterialStockItemCreateSerializer,
    MaterialStockItemSerializer,
    PaymentCreateSerializer,
    VendorCreateSerializer,
    VendorSerializer,
)
from .services.stock import apply_material_movement, record_payment


def _deny():
    return Response({"detail": "Bu işlem için yetkiniz yok."}, status=status.HTTP_403_FORBIDDEN)


def _get_site(request, site_id: int):
    return sites_for_user(request.user).filter(id=site_id).first()


class VendorListCreateView(generics.ListCreateAPIView):
    def get_queryset(self):
        if not can_access_finans(self.request.user):
            return Vendor.objects.none()
        return Vendor.objects.filter(
            company_id=self.request.user.company_id,
        ).select_related("subcontractor")

    def get_serializer_class(self):
        if self.request.method == "POST":
            return VendorCreateSerializer
        return VendorSerializer

    def list(self, request, *args, **kwargs):
        if not can_access_finans(request.user):
            return _deny()
        return super().list(request, *args, **kwargs)

    def create(self, request, *args, **kwargs):
        if not can_access_finans(request.user):
            return _deny()
        return super().create(request, *args, **kwargs)


class LedgerEntryListView(generics.ListAPIView):
    serializer_class = LedgerEntrySerializer

    def get_queryset(self):
        if not can_access_finans(self.request.user):
            return LedgerEntry.objects.none()
        site_id = self.request.query_params.get("site_id")
        accessible = sites_for_user(self.request.user)
        qs = LedgerEntry.objects.filter(site__in=accessible).select_related(
            "account", "vendor", "hakedis_period"
        )
        if site_id:
            qs = qs.filter(site_id=site_id)
        vendor_id = self.request.query_params.get("vendor_id")
        if vendor_id:
            qs = qs.filter(vendor_id=vendor_id)
        return qs

    def list(self, request, *args, **kwargs):
        if not can_access_finans(request.user):
            return _deny()
        site_id = request.query_params.get("site_id")
        if not site_id:
            return Response({"detail": "site_id gerekli."}, status=status.HTTP_400_BAD_REQUEST)
        if not sites_for_user(request.user).filter(id=site_id).exists():
            return Response({"detail": "Şantiye bulunamadı."}, status=status.HTTP_404_NOT_FOUND)
        return super().list(request, *args, **kwargs)


class LedgerSummaryView(APIView):
    def get(self, request):
        if not can_access_finans(request.user):
            return _deny()
        site_id = request.query_params.get("site_id")
        if not site_id:
            return Response({"detail": "site_id gerekli."}, status=status.HTTP_400_BAD_REQUEST)
        site = _get_site(request, int(site_id))
        if not site:
            return Response({"detail": "Şantiye bulunamadı."}, status=status.HTTP_404_NOT_FOUND)

        qs = LedgerEntry.objects.filter(site_id=site_id)
        credit = qs.filter(direction=LedgerEntry.Direction.CREDIT).aggregate(
            total=Sum("amount")
        )["total"] or Decimal("0")
        debit = qs.filter(direction=LedgerEntry.Direction.DEBIT).aggregate(
            total=Sum("amount")
        )["total"] or Decimal("0")
        budget_total = site.budget_total
        budget_spent = debit
        budget_remaining = None
        if budget_total is not None:
            budget_remaining = budget_total - budget_spent
        data = {
            "total_credit": credit,
            "total_debit": debit,
            "balance": credit - debit,
            "entry_count": qs.count(),
            "budget_total": budget_total,
            "budget_spent": budget_spent,
            "budget_remaining": budget_remaining,
        }
        return Response(LedgerSummarySerializer(data).data)


class PaymentCreateView(APIView):
    def post(self, request):
        if not can_access_finans(request.user):
            return _deny()
        serializer = PaymentCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        site = _get_site(request, serializer.validated_data["site_id"])
        if not site:
            return Response({"detail": "Şantiye bulunamadı."}, status=status.HTTP_404_NOT_FOUND)
        vendor = None
        vendor_id = serializer.validated_data.get("vendor_id")
        if vendor_id:
            vendor = Vendor.objects.filter(
                id=vendor_id, company_id=request.user.company_id
            ).first()
        entry = record_payment(
            site,
            serializer.validated_data["amount"],
            request.user,
            vendor=vendor,
            description=serializer.validated_data.get("description") or "",
            entry_date=serializer.validated_data.get("entry_date"),
        )
        return Response(LedgerEntrySerializer(entry).data, status=status.HTTP_201_CREATED)


class MaterialStockListCreateView(generics.ListCreateAPIView):
    def get_queryset(self):
        if not can_access_finans(self.request.user):
            return MaterialStockItem.objects.none()
        site_id = self.request.query_params.get("site_id")
        qs = MaterialStockItem.objects.filter(site__in=sites_for_user(self.request.user))
        if site_id:
            qs = qs.filter(site_id=site_id)
        return qs

    def get_serializer_class(self):
        if self.request.method == "POST":
            return MaterialStockItemCreateSerializer
        return MaterialStockItemSerializer

    def list(self, request, *args, **kwargs):
        if not can_access_finans(request.user):
            return _deny()
        if not request.query_params.get("site_id"):
            return Response({"detail": "site_id gerekli."}, status=status.HTTP_400_BAD_REQUEST)
        return super().list(request, *args, **kwargs)

    def create(self, request, *args, **kwargs):
        if not can_access_finans(request.user):
            return _deny()
        site_id = request.data.get("site_id")
        if not site_id:
            return Response({"detail": "site_id gerekli."}, status=status.HTTP_400_BAD_REQUEST)
        site = _get_site(request, int(site_id))
        if not site:
            return Response({"detail": "Şantiye bulunamadı."}, status=status.HTTP_404_NOT_FOUND)
        serializer = MaterialStockItemCreateSerializer(
            data=request.data, context={"site": site, "request": request}
        )
        serializer.is_valid(raise_exception=True)
        item = serializer.save()
        return Response(
            MaterialStockItemSerializer(item).data, status=status.HTTP_201_CREATED
        )


class MaterialMovementListCreateView(generics.ListCreateAPIView):
    def get_queryset(self):
        if not can_access_finans(self.request.user):
            return MaterialMovement.objects.none()
        site_id = self.request.query_params.get("site_id")
        qs = MaterialMovement.objects.filter(
            item__site__in=sites_for_user(self.request.user)
        ).select_related("item")
        if site_id:
            qs = qs.filter(item__site_id=site_id)
        return qs

    def get_serializer_class(self):
        if self.request.method == "POST":
            return MaterialMovementCreateSerializer
        return MaterialMovementSerializer

    def list(self, request, *args, **kwargs):
        if not can_access_finans(request.user):
            return _deny()
        if not request.query_params.get("site_id"):
            return Response({"detail": "site_id gerekli."}, status=status.HTTP_400_BAD_REQUEST)
        return super().list(request, *args, **kwargs)

    def create(self, request, *args, **kwargs):
        if not can_access_finans(request.user):
            return _deny()
        serializer = MaterialMovementCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        item = serializer.validated_data["item"]
        if not sites_for_user(request.user).filter(id=item.site_id).exists():
            return Response({"detail": "Şantiye bulunamadı."}, status=status.HTTP_404_NOT_FOUND)
        movement = MaterialMovement.objects.create(
            **serializer.validated_data,
            created_by=request.user,
        )
        try:
            apply_material_movement(item, movement)
        except ValueError as exc:
            movement.delete()
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(
            MaterialMovementSerializer(movement).data, status=status.HTTP_201_CREATED
        )
