from rest_framework import serializers

from .models import LedgerAccount, LedgerEntry, MaterialMovement, MaterialStockItem, Vendor


class VendorSerializer(serializers.ModelSerializer):
    subcontractor_name = serializers.CharField(
        source="subcontractor.name", read_only=True, allow_null=True
    )

    class Meta:
        model = Vendor
        fields = (
            "id",
            "name",
            "tax_number",
            "contact_phone",
            "notes",
            "is_active",
            "subcontractor",
            "subcontractor_name",
            "created_at",
        )
        read_only_fields = ("id", "created_at", "subcontractor_name")


class VendorCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Vendor
        fields = ("name", "tax_number", "contact_phone", "notes", "subcontractor")

    def validate(self, attrs):
        user = self.context["request"].user
        subcontractor = attrs.get("subcontractor")
        if subcontractor and subcontractor.site.company_id != user.company_id:
            raise serializers.ValidationError({"subcontractor": "Geçersiz taşeron."})
        return attrs

    def create(self, validated_data):
        return Vendor.objects.create(
            company=self.context["request"].user.company,
            **validated_data,
        )


class LedgerAccountSerializer(serializers.ModelSerializer):
    class Meta:
        model = LedgerAccount
        fields = ("id", "code", "name", "account_type", "is_system")


class LedgerEntrySerializer(serializers.ModelSerializer):
    account_code = serializers.CharField(source="account.code", read_only=True)
    account_name = serializers.CharField(source="account.name", read_only=True)
    vendor_name = serializers.SerializerMethodField()
    hakedis_period_id = serializers.IntegerField(read_only=True, allow_null=True)

    class Meta:
        model = LedgerEntry
        fields = (
            "id",
            "site",
            "account",
            "account_code",
            "account_name",
            "vendor",
            "vendor_name",
            "direction",
            "amount",
            "entry_date",
            "description",
            "source_type",
            "hakedis_period_id",
            "created_at",
        )

    def get_vendor_name(self, obj: LedgerEntry) -> str | None:
        return obj.vendor.name if obj.vendor_id else None


class LedgerSummarySerializer(serializers.Serializer):
    total_credit = serializers.DecimalField(max_digits=14, decimal_places=2)
    total_debit = serializers.DecimalField(max_digits=14, decimal_places=2)
    balance = serializers.DecimalField(max_digits=14, decimal_places=2)
    entry_count = serializers.IntegerField()
    budget_total = serializers.DecimalField(
        max_digits=14, decimal_places=2, allow_null=True, required=False
    )
    budget_spent = serializers.DecimalField(
        max_digits=14, decimal_places=2, required=False
    )
    budget_remaining = serializers.DecimalField(
        max_digits=14, decimal_places=2, allow_null=True, required=False
    )


class MaterialStockItemSerializer(serializers.ModelSerializer):
    is_low = serializers.SerializerMethodField()

    class Meta:
        model = MaterialStockItem
        fields = (
            "id",
            "site",
            "name",
            "unit",
            "quantity_on_hand",
            "reorder_level",
            "is_low",
            "notes",
            "created_at",
        )
        read_only_fields = ("id", "site", "quantity_on_hand", "created_at", "is_low")

    def get_is_low(self, obj):
        if obj.reorder_level is None:
            return False
        return obj.quantity_on_hand <= obj.reorder_level


class MaterialStockItemCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = MaterialStockItem
        fields = ("name", "unit", "reorder_level", "notes", "quantity_on_hand")

    def create(self, validated_data):
        site = self.context["site"]
        return MaterialStockItem.objects.create(site=site, **validated_data)


class MaterialMovementSerializer(serializers.ModelSerializer):
    item_name = serializers.CharField(source="item.name", read_only=True)

    class Meta:
        model = MaterialMovement
        fields = (
            "id",
            "item",
            "item_name",
            "movement_type",
            "quantity",
            "movement_date",
            "notes",
            "created_at",
        )
        read_only_fields = ("id", "item_name", "created_at")


class MaterialMovementCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = MaterialMovement
        fields = ("item", "movement_type", "quantity", "movement_date", "notes")

    def validate_quantity(self, value):
        if value <= 0:
            raise serializers.ValidationError("Miktar pozitif olmalı.")
        return value


class PaymentCreateSerializer(serializers.Serializer):
    site_id = serializers.IntegerField()
    amount = serializers.DecimalField(max_digits=14, decimal_places=2)
    vendor_id = serializers.IntegerField(required=False, allow_null=True)
    description = serializers.CharField(required=False, allow_blank=True, default="")
    entry_date = serializers.DateField(required=False)
