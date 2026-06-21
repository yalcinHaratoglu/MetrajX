import mimetypes
import re

from django.db.models import Q
from django.http import FileResponse, Http404
from django.utils.text import slugify
from rest_framework import generics, status
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView

from authentication.models import CustomUser
from core_backend.upload_limits import is_upload_too_large, upload_too_large_response
from sites.services import sites_for_user

from .models import MetrajCategory, MetrajDocument, MetrajItem, MetrajOperation
from .serializers import (
    MetrajCategoryCreateSerializer,
    MetrajCategorySerializer,
    MetrajCategoryUpdateSerializer,
    MetrajDocumentSerializer,
    MetrajItemCreateSerializer,
    MetrajItemDetailSerializer,
    MetrajItemSerializer,
    MetrajOperationCreateSerializer,
    MetrajOperationSerializer,
)
from .services.excel_io import build_template_workbook, export_metraj_workbook, import_metraj_from_workbook
from .services.progress import recalculate_item_completion


def _get_item_or_403(request, item_id):
    accessible = sites_for_user(request.user)
    return MetrajItem.objects.filter(id=item_id, site__in=accessible).select_related("site", "category").first()


def _get_site_or_403(request, site_id):
    return sites_for_user(request.user).filter(id=site_id).first()


def _categories_for_user(user):
    if not user.company_id:
        return MetrajCategory.objects.none()
    return MetrajCategory.objects.filter(company_id=user.company_id)


def _detect_file_kind(filename: str, mime: str) -> str:
    lower = filename.lower()
    if lower.endswith((".xlsx", ".xls", ".csv")) or "spreadsheet" in mime:
        return MetrajDocument.FileKind.EXCEL
    if lower.endswith(".pdf") or mime == "application/pdf":
        return MetrajDocument.FileKind.PDF
    if lower.endswith((".doc", ".docx")) or "word" in mime:
        return MetrajDocument.FileKind.WORD
    if mime.startswith("image/") or lower.endswith((".jpg", ".jpeg", ".png", ".webp", ".gif")):
        return MetrajDocument.FileKind.IMAGE
    return MetrajDocument.FileKind.OTHER


class CategoryListCreateView(generics.ListCreateAPIView):
    def get_queryset(self):
        return _categories_for_user(self.request.user)

    def get_serializer_class(self):
        if self.request.method == "POST":
            return MetrajCategoryCreateSerializer
        return MetrajCategorySerializer

    def create(self, request, *args, **kwargs):
        if not request.user.company:
            return Response(
                {"detail": "Şirket bilgisi gerekli."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        name = serializer.validated_data["name"]
        slug = serializer.validated_data.get("slug") or slugify(name, allow_unicode=True)
        slug = re.sub(r"[^a-z0-9-]", "", slug.replace(" ", "-"))[:32] or "kategori"
        base_slug = slug
        counter = 1
        while MetrajCategory.objects.filter(company=request.user.company, slug=slug).exists():
            slug = f"{base_slug}-{counter}"[:32]
            counter += 1
        category = MetrajCategory.objects.create(
            company=request.user.company,
            slug=slug,
            name=name,
            default_unit=serializer.validated_data.get("default_unit", "m2"),
            sort_order=serializer.validated_data.get("sort_order", 0),
            is_custom=True,
        )
        return Response(MetrajCategorySerializer(category).data, status=status.HTTP_201_CREATED)


class CategoryDetailView(generics.RetrieveUpdateDestroyAPIView):
    def get_serializer_class(self):
        if self.request.method in ("PUT", "PATCH"):
            return MetrajCategoryUpdateSerializer
        return MetrajCategorySerializer

    def get_queryset(self):
        return _categories_for_user(self.request.user)

    def update(self, request, *args, **kwargs):
        category = self.get_object()
        if category.company_id != request.user.company_id:
            return Response(
                {"detail": "Bu kategoriyi düzenleme yetkiniz yok."},
                status=status.HTTP_403_FORBIDDEN,
            )
        return super().update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        category = self.get_object()
        if category.company_id != request.user.company_id:
            return Response(
                {"detail": "Bu kategoriyi silme yetkiniz yok."},
                status=status.HTTP_403_FORBIDDEN,
            )
        if MetrajItem.objects.filter(category=category).exists():
            return Response(
                {"detail": "Kategoriye bağlı metraj kalemleri var. Önce kalemleri silin."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return super().destroy(request, *args, **kwargs)


class MetrajItemListCreateView(generics.ListCreateAPIView):
    def get_site(self):
        site_id = self.request.query_params.get("site_id") or self.request.data.get("site_id")
        if not site_id:
            return None
        return _get_site_or_403(self.request, site_id)

    def get_queryset(self):
        site = self.get_site()
        if not site:
            return MetrajItem.objects.none()
        qs = MetrajItem.objects.filter(site=site).select_related("category").prefetch_related("operations")
        category = self.request.query_params.get("category")
        if category and category != "all":
            qs = qs.filter(category__slug=category)
        search = self.request.query_params.get("search", "").strip()
        if search:
            qs = qs.filter(
                Q(description__icontains=search)
                | Q(notes__icontains=search)
                | Q(category__name__icontains=search)
            )
        return qs

    def get_serializer_class(self):
        if self.request.method == "POST":
            return MetrajItemCreateSerializer
        return MetrajItemSerializer

    def list(self, request, *args, **kwargs):
        if not request.query_params.get("site_id"):
            return Response(
                {"detail": "site_id parametresi gerekli."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if not self.get_site():
            return Response(
                {"detail": "Şantiye bulunamadı veya erişim yok."},
                status=status.HTTP_404_NOT_FOUND,
            )
        return super().list(request, *args, **kwargs)

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context["request"] = self.request
        return context

    def create(self, request, *args, **kwargs):
        site_id = request.data.get("site_id")
        if not site_id:
            return Response({"detail": "site_id gerekli."}, status=status.HTTP_400_BAD_REQUEST)
        site = _get_site_or_403(request, site_id)
        if not site:
            return Response(
                {"detail": "Şantiye bulunamadı veya erişim yok."},
                status=status.HTTP_404_NOT_FOUND,
            )
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        item = serializer.save(site=site)
        return Response(MetrajItemSerializer(item).data, status=status.HTTP_201_CREATED)


class MetrajItemDetailView(generics.RetrieveUpdateDestroyAPIView):
    def get_queryset(self):
        accessible = sites_for_user(self.request.user)
        return (
            MetrajItem.objects.filter(site__in=accessible)
            .select_related("category", "site")
            .prefetch_related("operations__documents")
        )

    def get_serializer_class(self):
        if self.request.method in ("PUT", "PATCH"):
            return MetrajItemCreateSerializer
        if self.request.method == "GET":
            return MetrajItemDetailSerializer
        return MetrajItemSerializer

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context["request"] = self.request
        return context

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop("partial", False)
        instance = self.get_object()
        serializer = MetrajItemCreateSerializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        instance.refresh_from_db()
        return Response(MetrajItemSerializer(instance).data)


class MetrajSummaryView(APIView):
    def get(self, request):
        from decimal import Decimal

        from django.db.models import Avg, Count

        site_id = request.query_params.get("site_id")
        if not site_id:
            return Response(
                {"detail": "site_id parametresi gerekli."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        site = _get_site_or_403(request, site_id)
        if not site:
            return Response(
                {"detail": "Şantiye bulunamadı veya erişim yok."},
                status=status.HTTP_404_NOT_FOUND,
            )

        items = MetrajItem.objects.filter(site=site)
        agg = items.aggregate(
            item_count=Count("id"),
            average_progress=Avg("completion_percent"),
        )

        estimated = Decimal("0")
        has_cost = False
        for price in items.values_list("unit_price", flat=True):
            if price is not None:
                estimated += price
                has_cost = True

        by_category = []
        items_with_cat = items.select_related("category")
        for cat in _categories_for_user(request.user):
            cat_items = items_with_cat.filter(category=cat)
            if not cat_items.exists():
                continue
            cat_agg = cat_items.aggregate(
                count=Count("id"),
                avg_progress=Avg("completion_percent"),
            )
            by_category.append(
                {
                    "slug": cat.slug,
                    "name": cat.name,
                    "item_count": cat_agg["count"],
                    "average_progress": round(cat_agg["avg_progress"] or 0, 1),
                }
            )

        return Response(
            {
                "item_count": agg["item_count"] or 0,
                "average_progress": round(agg["average_progress"] or 0, 1),
                "estimated_cost": estimated if has_cost else None,
                "by_category": by_category,
            }
        )


class MetrajTemplateView(APIView):
    def get(self, request):
        from django.http import HttpResponse

        buffer = build_template_workbook()
        response = HttpResponse(
            buffer.getvalue(),
            content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        )
        response["Content-Disposition"] = 'attachment; filename="metraj-sablonu.xlsx"'
        return response


class MetrajImportView(APIView):
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        site_id = request.data.get("site_id")
        upload = request.FILES.get("file")
        if not site_id or not upload:
            return Response(
                {"detail": "site_id ve file gerekli."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        site = _get_site_or_403(request, site_id)
        if not site:
            return Response(
                {"detail": "Şantiye bulunamadı veya erişim yok."},
                status=status.HTTP_404_NOT_FOUND,
            )
        if is_upload_too_large(upload):
            return upload_too_large_response()
        created = import_metraj_from_workbook(site, upload)
        return Response(
            {"detail": f"{len(created)} metraj kalemi içe aktarıldı.", "count": len(created)}
        )


class MetrajExportView(APIView):
    def get(self, request):
        from django.http import HttpResponse

        site_id = request.query_params.get("site_id")
        if not site_id:
            return Response(
                {"detail": "site_id parametresi gerekli."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        site = _get_site_or_403(request, site_id)
        if not site:
            return Response(
                {"detail": "Şantiye bulunamadı veya erişim yok."},
                status=status.HTTP_404_NOT_FOUND,
            )
        buffer = export_metraj_workbook(site)
        filename = f"metraj-{site.code or site.id}.xlsx"
        response = HttpResponse(
            buffer.getvalue(),
            content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        )
        response["Content-Disposition"] = f'attachment; filename="{filename}"'
        return response


class MetrajDocumentListCreateView(generics.ListCreateAPIView):
    serializer_class = MetrajDocumentSerializer
    parser_classes = [MultiPartParser, FormParser]

    def get_queryset(self):
        site_id = self.request.query_params.get("site_id")
        item_id = self.request.query_params.get("item_id")
        if not site_id:
            return MetrajDocument.objects.none()
        site = _get_site_or_403(self.request, int(site_id))
        if not site:
            return MetrajDocument.objects.none()
        qs = MetrajDocument.objects.filter(site=site).select_related("uploaded_by", "item")
        if item_id:
            qs = qs.filter(item_id=item_id)
        if self.request.query_params.get("item_only", "").lower() in ("1", "true", "yes"):
            qs = qs.filter(operation__isnull=True)
        return qs

    def list(self, request, *args, **kwargs):
        if not request.query_params.get("site_id"):
            return Response(
                {"detail": "site_id parametresi gerekli."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return super().list(request, *args, **kwargs)

    def create(self, request, *args, **kwargs):
        site_id = request.data.get("site_id")
        item_id = request.data.get("item_id")
        operation_id = request.data.get("operation_id")
        upload = request.FILES.get("file")
        if not site_id or not upload:
            return Response(
                {"detail": "site_id ve file gerekli."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        site = _get_site_or_403(request, site_id)
        if not site:
            return Response(
                {"detail": "Şantiye bulunamadı veya erişim yok."},
                status=status.HTTP_404_NOT_FOUND,
            )
        if is_upload_too_large(upload):
            return upload_too_large_response()
        item = None
        operation = None
        if operation_id:
            operation = MetrajOperation.objects.filter(id=operation_id, item__site=site).select_related("item").first()
            if not operation:
                return Response(
                    {"detail": "İşlem bulunamadı."},
                    status=status.HTTP_404_NOT_FOUND,
                )
            item = operation.item
        elif item_id:
            item = MetrajItem.objects.filter(id=item_id, site=site).first()
            if not item:
                return Response(
                    {"detail": "Metraj kalemi bulunamadı."},
                    status=status.HTTP_404_NOT_FOUND,
                )
        mime = upload.content_type or mimetypes.guess_type(upload.name)[0] or ""
        doc = MetrajDocument.objects.create(
            site=site,
            item=item,
            operation=operation,
            uploaded_by=request.user,
            file=upload,
            original_filename=upload.name,
            mime_type=mime,
            file_kind=_detect_file_kind(upload.name, mime),
            file_size=upload.size,
            title=(request.data.get("title") or upload.name)[:255],
        )
        return Response(MetrajDocumentSerializer(doc, context={"request": request}).data, status=201)


class MetrajOperationListCreateView(generics.ListCreateAPIView):
    def get_item(self):
        return _get_item_or_403(self.request, self.kwargs["item_id"])

    def get_queryset(self):
        item = self.get_item()
        if not item:
            return MetrajOperation.objects.none()
        return item.operations.prefetch_related("documents")

    def get_serializer_class(self):
        if self.request.method == "POST":
            return MetrajOperationCreateSerializer
        return MetrajOperationSerializer

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context["request"] = self.request
        return context

    def list(self, request, *args, **kwargs):
        if not self.get_item():
            return Response(
                {"detail": "Metraj kalemi bulunamadı veya erişim yok."},
                status=status.HTTP_404_NOT_FOUND,
            )
        return super().list(request, *args, **kwargs)

    def create(self, request, *args, **kwargs):
        item = self.get_item()
        if not item:
            return Response(
                {"detail": "Metraj kalemi bulunamadı veya erişim yok."},
                status=status.HTTP_404_NOT_FOUND,
            )
        serializer = self.get_serializer(
            data=request.data,
            context={**self.get_serializer_context(), "item": item},
        )
        serializer.is_valid(raise_exception=True)
        operation = serializer.save(item=item)
        recalculate_item_completion(item)
        operation.refresh_from_db()
        return Response(
            MetrajOperationSerializer(operation, context={"request": request}).data,
            status=status.HTTP_201_CREATED,
        )


class MetrajOperationDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = MetrajOperationSerializer

    def get_queryset(self):
        accessible = sites_for_user(self.request.user)
        return MetrajOperation.objects.filter(item__site__in=accessible).prefetch_related("documents")

    def get_serializer_class(self):
        if self.request.method in ("PUT", "PATCH"):
            return MetrajOperationCreateSerializer
        return MetrajOperationSerializer

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context["request"] = self.request
        return context

    def get_serializer(self, *args, **kwargs):
        kwargs.setdefault("context", self.get_serializer_context())
        if self.request.method in ("PUT", "PATCH") and "data" in kwargs:
            try:
                operation = self.get_object()
                kwargs["context"]["item"] = operation.item
            except Exception:
                pass
        return super().get_serializer(*args, **kwargs)

    def perform_update(self, serializer):
        operation = serializer.save()
        recalculate_item_completion(operation.item)

    def perform_destroy(self, instance):
        item = instance.item
        instance.delete()
        recalculate_item_completion(item)


class MetrajCalendarView(APIView):
    def get(self, request):
        site_id = request.query_params.get("site_id")
        item_id = request.query_params.get("item_id")
        if not site_id:
            return Response(
                {"detail": "site_id parametresi gerekli."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        site = _get_site_or_403(request, site_id)
        if not site:
            return Response(
                {"detail": "Şantiye bulunamadı veya erişim yok."},
                status=status.HTTP_404_NOT_FOUND,
            )
        qs = MetrajOperation.objects.filter(item__site=site).select_related("item", "item__category")
        if item_id:
            qs = qs.filter(item_id=item_id)
        data = MetrajOperationSerializer(qs, many=True, context={"request": request}).data
        return Response(data)


class MetrajDocumentDetailView(generics.RetrieveDestroyAPIView):
    serializer_class = MetrajDocumentSerializer

    def get_queryset(self):
        accessible = sites_for_user(self.request.user)
        return MetrajDocument.objects.filter(site__in=accessible)


class MetrajDocumentDownloadView(APIView):
    def get(self, request, pk):
        accessible = sites_for_user(request.user)
        doc = MetrajDocument.objects.filter(pk=pk, site__in=accessible).first()
        if not doc or not doc.file:
            raise Http404
        response = FileResponse(doc.file.open("rb"), as_attachment=False)
        response["Content-Type"] = doc.mime_type or "application/octet-stream"
        response["Content-Disposition"] = f'inline; filename="{doc.original_filename}"'
        return response
