from rest_framework import serializers

from .models import MetrajCategory, MetrajDocument, MetrajItem


class MetrajCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = MetrajCategory
        fields = (
            "id",
            "slug",
            "name",
            "default_unit",
            "sort_order",
            "is_custom",
            "company",
        )
        read_only_fields = ("id", "slug", "is_custom", "company")


class MetrajCategoryUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = MetrajCategory
        fields = ("name", "default_unit")


class MetrajCategoryCreateSerializer(serializers.ModelSerializer):
    slug = serializers.SlugField(required=False, allow_blank=True)

    class Meta:
        model = MetrajCategory
        fields = ("name", "default_unit", "sort_order", "slug")


class MetrajDocumentBriefSerializer(serializers.ModelSerializer):
    preview_url = serializers.SerializerMethodField()

    class Meta:
        model = MetrajDocument
        fields = (
            "id",
            "title",
            "original_filename",
            "file_kind",
            "file_size",
            "preview_url",
            "created_at",
        )
        read_only_fields = fields

    def get_preview_url(self, obj):
        if obj.file_kind not in (MetrajDocument.FileKind.IMAGE, MetrajDocument.FileKind.PDF):
            return None
        request = self.context.get("request")
        if not request:
            return None
        return request.build_absolute_uri(f"/api/metraj/documents/{obj.pk}/download/")


class MetrajItemSerializer(serializers.ModelSerializer):
    category_slug = serializers.CharField(source="category.slug", read_only=True)
    category_name = serializers.CharField(source="category.name", read_only=True)
    total_amount = serializers.DecimalField(
        max_digits=14,
        decimal_places=2,
        read_only=True,
        allow_null=True,
    )
    documents = MetrajDocumentBriefSerializer(many=True, read_only=True)

    class Meta:
        model = MetrajItem
        fields = (
            "id",
            "site",
            "category",
            "category_slug",
            "category_name",
            "description",
            "unit",
            "quantity",
            "unit_price",
            "total_amount",
            "completion_percent",
            "notes",
            "documents",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "site", "created_at", "updated_at", "total_amount")


class MetrajItemCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = MetrajItem
        fields = (
            "category",
            "description",
            "unit",
            "quantity",
            "unit_price",
            "completion_percent",
            "notes",
        )

    def validate_completion_percent(self, value):
        return max(0, min(100, value))


class MetrajDocumentSerializer(serializers.ModelSerializer):
    download_url = serializers.SerializerMethodField()
    preview_url = serializers.SerializerMethodField()
    uploaded_by_name = serializers.SerializerMethodField()

    class Meta:
        model = MetrajDocument
        fields = (
            "id",
            "site",
            "item",
            "title",
            "original_filename",
            "mime_type",
            "file_kind",
            "file_size",
            "download_url",
            "preview_url",
            "uploaded_by_name",
            "created_at",
        )
        read_only_fields = fields

    def get_download_url(self, obj):
        request = self.context.get("request")
        if not request:
            return None
        return request.build_absolute_uri(f"/api/metraj/documents/{obj.pk}/download/")

    def get_preview_url(self, obj):
        if obj.file_kind in (MetrajDocument.FileKind.IMAGE, MetrajDocument.FileKind.PDF):
            return self.get_download_url(obj)
        return None

    def get_uploaded_by_name(self, obj):
        if not obj.uploaded_by:
            return ""
        return obj.uploaded_by.get_full_name() or obj.uploaded_by.email
