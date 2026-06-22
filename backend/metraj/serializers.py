from rest_framework import serializers

from .models import MetrajCategory, MetrajDocument, MetrajItem, MetrajOperation, PozTemplate


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
        fields = ("name", "default_unit", "slug")


class PozTemplateSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source="category.name", read_only=True)

    class Meta:
        model = PozTemplate
        fields = (
            "id",
            "category",
            "category_name",
            "description",
            "default_unit",
            "default_unit_price",
            "is_active",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "company", "created_at", "updated_at")


class PozTemplateCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = PozTemplate
        fields = ("category", "description", "default_unit", "default_unit_price", "is_active")


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


class MetrajOperationSerializer(serializers.ModelSerializer):
    documents = MetrajDocumentBriefSerializer(many=True, read_only=True)
    item_description = serializers.CharField(source="item.description", read_only=True)
    category_name = serializers.CharField(source="item.category.name", read_only=True)

    class Meta:
        model = MetrajOperation
        fields = (
            "id",
            "item",
            "item_description",
            "category_name",
            "title",
            "scheduled_date",
            "scheduled_time",
            "status",
            "progress_percent",
            "quantity_done",
            "notes",
            "documents",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "item", "created_at", "updated_at")

    def validate_progress_percent(self, value):
        return max(0, min(100, value))


class MetrajOperationCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = MetrajOperation
        fields = ("title", "scheduled_date", "scheduled_time", "status", "progress_percent", "quantity_done", "notes")

    def validate_progress_percent(self, value):
        return max(0, min(100, value))


class MetrajItemSerializer(serializers.ModelSerializer):
    category_slug = serializers.CharField(source="category.slug", read_only=True)
    category_name = serializers.CharField(source="category.name", read_only=True)
    subcontractor_name = serializers.CharField(source="subcontractor.name", read_only=True, allow_null=True)
    total_amount = serializers.SerializerMethodField()
    contract_amount = serializers.SerializerMethodField()
    operations_count = serializers.SerializerMethodField()

    class Meta:
        model = MetrajItem
        fields = (
            "id",
            "site",
            "category",
            "category_slug",
            "category_name",
            "poz_template",
            "subcontractor",
            "subcontractor_name",
            "description",
            "unit",
            "quantity",
            "unit_price",
            "contract_amount",
            "total_amount",
            "completion_percent",
            "operations_count",
            "notes",
            "created_at",
            "updated_at",
        )
        read_only_fields = (
            "id",
            "site",
            "created_at",
            "updated_at",
            "total_amount",
            "contract_amount",
            "completion_percent",
            "operations_count",
            "subcontractor_name",
        )

    def get_total_amount(self, obj):
        val = obj.total_amount
        return val if val is not None else None

    def get_contract_amount(self, obj):
        val = obj.contract_amount
        return val if val is not None else None

    def get_operations_count(self, obj):
        if hasattr(obj, "_prefetched_objects_cache") and "operations" in obj._prefetched_objects_cache:
            return len(obj.operations.all())
        return obj.operations.count()


class MetrajItemDetailSerializer(MetrajItemSerializer):
    operations = MetrajOperationSerializer(many=True, read_only=True)

    class Meta(MetrajItemSerializer.Meta):
        fields = MetrajItemSerializer.Meta.fields + ("operations",)


class MetrajItemCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = MetrajItem
        fields = (
            "category",
            "poz_template",
            "subcontractor",
            "description",
            "unit",
            "quantity",
            "unit_price",
            "notes",
        )

    def validate(self, attrs):
        poz = attrs.get("poz_template")
        if poz and not attrs.get("description"):
            attrs["description"] = poz.description
        if poz and not attrs.get("unit"):
            attrs["unit"] = poz.default_unit
        if poz and attrs.get("unit_price") in (None, "") and poz.default_unit_price is not None:
            attrs["unit_price"] = poz.default_unit_price
        if poz and not attrs.get("category"):
            attrs["category"] = poz.category
        return attrs

    def validate_subcontractor(self, value):
        if value is None:
            return value
        item = self.instance
        site_id = item.site_id if item else self.context.get("site_id")
        if site_id and value.site_id != site_id:
            raise serializers.ValidationError("Taşeron bu şantiyeye ait değil.")
        return value


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
            "operation",
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
