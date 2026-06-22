from rest_framework import serializers

from metraj.models import MetrajCategory, MetrajItem

from .models import (
    AdvancePayment,
    HakedisPeriod,
    HakedisPeriodLine,
    HakedisPeriodSubcontractorDeduction,
    Subcontractor,
    SubcontractorContract,
    Timesheet,
    Worker,
)


def _validate_category_for_site(category: MetrajCategory, site) -> None:
    if category.company_id != site.company_id:
        raise serializers.ValidationError(
            {"category": "Kategori şantiye şirketine ait değil."}
        )


class SubcontractorSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source="category.name", read_only=True)
    timesheet_count = serializers.SerializerMethodField()
    metraj_item_count = serializers.SerializerMethodField()
    earned_total = serializers.SerializerMethodField()
    contract_total = serializers.SerializerMethodField()

    class Meta:
        model = Subcontractor
        fields = [
            "id",
            "site",
            "name",
            "category",
            "category_name",
            "contact_phone",
            "notes",
            "is_active",
            "timesheet_count",
            "metraj_item_count",
            "earned_total",
            "contract_total",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "created_at",
            "updated_at",
            "timesheet_count",
            "metraj_item_count",
            "earned_total",
            "contract_total",
        ]

    def get_timesheet_count(self, obj: Subcontractor) -> int:
        return getattr(obj, "timesheet_count", obj.timesheets.count())

    def get_metraj_item_count(self, obj: Subcontractor) -> int:
        return getattr(obj, "metraj_item_count", obj.metraj_items.count())

    def get_earned_total(self, obj: Subcontractor):
        if hasattr(obj, "earned_total"):
            return obj.earned_total
        from .services.hakedis import hakedis_for_subcontractor
        return hakedis_for_subcontractor(obj.id)["earned_total"]

    def get_contract_total(self, obj: Subcontractor):
        if hasattr(obj, "contract_total"):
            return obj.contract_total
        from .services.hakedis import hakedis_for_subcontractor
        return hakedis_for_subcontractor(obj.id)["contract_total"]


class SubcontractorCreateSerializer(serializers.ModelSerializer):
    site_id = serializers.IntegerField(write_only=True)

    class Meta:
        model = Subcontractor
        fields = [
            "site_id",
            "name",
            "category",
            "contact_phone",
            "notes",
            "is_active",
        ]

    def validate(self, attrs):
        from sites.models import Site

        site_id = self.initial_data.get("site_id")
        category = attrs.get("category")
        if site_id and category:
            site = Site.objects.filter(pk=site_id).first()
            if site:
                _validate_category_for_site(category, site)
        return attrs


class SubcontractorUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Subcontractor
        fields = [
            "name",
            "category",
            "contact_phone",
            "notes",
            "is_active",
        ]

    def validate(self, attrs):
        instance: Subcontractor = self.instance
        category = attrs.get("category", instance.category)
        if category:
            _validate_category_for_site(category, instance.site)
        return attrs


class WorkerSerializer(serializers.ModelSerializer):
    subcontractor_name = serializers.CharField(source="subcontractor.name", read_only=True)
    full_name = serializers.CharField(read_only=True)

    class Meta:
        model = Worker
        fields = [
            "id",
            "subcontractor",
            "subcontractor_name",
            "first_name",
            "last_name",
            "full_name",
            "national_id",
            "insurance_status",
            "phone",
            "is_active",
            "notes",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["created_at", "updated_at", "full_name"]


class WorkerCreateSerializer(serializers.ModelSerializer):
    site_id = serializers.IntegerField(write_only=True)

    class Meta:
        model = Worker
        fields = [
            "site_id",
            "subcontractor",
            "first_name",
            "last_name",
            "national_id",
            "insurance_status",
            "phone",
            "is_active",
            "notes",
        ]

    def validate(self, attrs):
        subcontractor: Subcontractor = attrs["subcontractor"]
        site_id = self.initial_data.get("site_id")
        if site_id and subcontractor.site_id != int(site_id):
            raise serializers.ValidationError(
                {"subcontractor": "Taşeron seçili şantiyeye ait değil."}
            )
        return attrs


class WorkerUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Worker
        fields = [
            "subcontractor",
            "first_name",
            "last_name",
            "national_id",
            "insurance_status",
            "phone",
            "is_active",
            "notes",
        ]


class TimesheetSerializer(serializers.ModelSerializer):
    subcontractor_name = serializers.CharField(source="subcontractor.name", read_only=True)
    worker_name = serializers.SerializerMethodField()
    created_by_name = serializers.SerializerMethodField()
    approved_by_name = serializers.SerializerMethodField()

    class Meta:
        model = Timesheet
        fields = [
            "id",
            "site",
            "subcontractor",
            "subcontractor_name",
            "worker",
            "worker_name",
            "date",
            "worker_count",
            "status",
            "approved_by",
            "approved_by_name",
            "approved_at",
            "notes",
            "created_by",
            "created_by_name",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "site",
            "created_by",
            "created_by_name",
            "approved_by",
            "approved_at",
            "created_at",
            "updated_at",
        ]

    def get_worker_name(self, obj: Timesheet) -> str:
        if obj.worker_id:
            return obj.worker.full_name
        return ""

    def get_created_by_name(self, obj: Timesheet) -> str:
        return _user_display(obj.created_by)

    def get_approved_by_name(self, obj: Timesheet) -> str:
        return _user_display(obj.approved_by)


class TimesheetCreateSerializer(serializers.ModelSerializer):
    site_id = serializers.IntegerField(write_only=True)

    class Meta:
        model = Timesheet
        fields = [
            "site_id",
            "subcontractor",
            "worker",
            "date",
            "worker_count",
            "notes",
        ]

    def validate(self, attrs):
        subcontractor: Subcontractor = attrs["subcontractor"]
        worker = attrs.get("worker")
        site_id = self.initial_data.get("site_id")
        if site_id and subcontractor.site_id != int(site_id):
            raise serializers.ValidationError(
                {"subcontractor": "Taşeron seçili şantiyeye ait değil."}
            )
        if worker and worker.subcontractor_id != subcontractor.id:
            raise serializers.ValidationError(
                {"worker": "İşçi seçili taşerona ait değil."}
            )
        if not worker and not attrs.get("worker_count"):
            attrs["worker_count"] = 1
        return attrs


class SettlementLineSerializer(serializers.Serializer):
    subcontractor_id = serializers.IntegerField()
    subcontractor_name = serializers.CharField()
    category_id = serializers.IntegerField()
    category_name = serializers.CharField()
    item_count = serializers.IntegerField()
    contract_total = serializers.DecimalField(max_digits=14, decimal_places=2)
    earned_total = serializers.DecimalField(max_digits=14, decimal_places=2)
    average_progress = serializers.FloatField()
    month_worker_days = serializers.IntegerField()


class SettlementSerializer(serializers.Serializer):
    year = serializers.IntegerField()
    month = serializers.IntegerField()
    entry_count = serializers.IntegerField()
    worker_days = serializers.IntegerField()
    grand_total = serializers.DecimalField(max_digits=14, decimal_places=2)
    contract_total = serializers.DecimalField(max_digits=14, decimal_places=2)
    lines = SettlementLineSerializer(many=True)


class HakedisItemLineSerializer(serializers.Serializer):
    item_id = serializers.IntegerField()
    description = serializers.CharField()
    category_name = serializers.CharField()
    unit = serializers.CharField()
    quantity = serializers.DecimalField(max_digits=14, decimal_places=3)
    completion_percent = serializers.IntegerField()
    unit_price = serializers.DecimalField(max_digits=14, decimal_places=2, allow_null=True)
    contract_amount = serializers.DecimalField(max_digits=14, decimal_places=2)
    earned_amount = serializers.DecimalField(max_digits=14, decimal_places=2)


class HakedisSubcontractorSerializer(serializers.Serializer):
    subcontractor_id = serializers.IntegerField()
    subcontractor_name = serializers.CharField()
    site_id = serializers.IntegerField(allow_null=True)
    category_id = serializers.IntegerField(required=False)
    category_name = serializers.CharField(required=False)
    item_count = serializers.IntegerField()
    contract_total = serializers.DecimalField(max_digits=14, decimal_places=2)
    earned_total = serializers.DecimalField(max_digits=14, decimal_places=2)
    average_progress = serializers.FloatField()
    items = HakedisItemLineSerializer(many=True)


class HakedisSiteSerializer(serializers.Serializer):
    site_id = serializers.IntegerField()
    subcontractor_count = serializers.IntegerField()
    item_count = serializers.IntegerField()
    contract_total = serializers.DecimalField(max_digits=14, decimal_places=2)
    earned_total = serializers.DecimalField(max_digits=14, decimal_places=2)
    lines = serializers.ListField(child=serializers.DictField())
    is_estimate = serializers.BooleanField(default=True)


class SubcontractorContractSerializer(serializers.ModelSerializer):
    subcontractor_name = serializers.CharField(source="subcontractor.name", read_only=True)

    class Meta:
        model = SubcontractorContract
        fields = [
            "id",
            "subcontractor",
            "subcontractor_name",
            "contract_no",
            "total_amount",
            "scope",
            "retainage_percent",
            "status",
            "start_date",
            "end_date",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["created_at", "updated_at"]


class SubcontractorContractCreateSerializer(serializers.ModelSerializer):
    site_id = serializers.IntegerField(write_only=True)

    class Meta:
        model = SubcontractorContract
        fields = [
            "site_id",
            "subcontractor",
            "contract_no",
            "total_amount",
            "scope",
            "retainage_percent",
            "status",
            "start_date",
            "end_date",
        ]

    def validate(self, attrs):
        sub: Subcontractor = attrs["subcontractor"]
        site_id = self.initial_data.get("site_id")
        if site_id and sub.site_id != int(site_id):
            raise serializers.ValidationError(
                {"subcontractor": "Taşeron seçili şantiyeye ait değil."}
            )
        return attrs


class AdvancePaymentSerializer(serializers.ModelSerializer):
    subcontractor_name = serializers.CharField(source="subcontractor.name", read_only=True)

    class Meta:
        model = AdvancePayment
        fields = [
            "id",
            "subcontractor",
            "subcontractor_name",
            "site",
            "amount",
            "payment_date",
            "remaining_balance",
            "notes",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["site", "remaining_balance", "created_at", "updated_at"]


class AdvancePaymentCreateSerializer(serializers.ModelSerializer):
    site_id = serializers.IntegerField(write_only=True)

    class Meta:
        model = AdvancePayment
        fields = ["site_id", "subcontractor", "amount", "payment_date", "notes"]

    def validate(self, attrs):
        sub: Subcontractor = attrs["subcontractor"]
        site_id = self.initial_data.get("site_id")
        if site_id and sub.site_id != int(site_id):
            raise serializers.ValidationError(
                {"subcontractor": "Taşeron seçili şantiyeye ait değil."}
            )
        return attrs


class HakedisPeriodLineSerializer(serializers.ModelSerializer):
    description = serializers.CharField(source="metraj_item.description", read_only=True)
    category_name = serializers.CharField(source="metraj_item.category.name", read_only=True)
    subcontractor_name = serializers.CharField(source="subcontractor.name", read_only=True)

    class Meta:
        model = HakedisPeriodLine
        fields = [
            "id",
            "metraj_item",
            "description",
            "category_name",
            "subcontractor",
            "subcontractor_name",
            "quantity",
            "unit_price",
            "prev_cumulative_percent",
            "current_cumulative_percent",
            "delta_percent",
            "line_gross",
        ]


class HakedisPeriodSubcontractorDeductionSerializer(serializers.ModelSerializer):
    subcontractor_name = serializers.CharField(source="subcontractor.name", read_only=True)

    class Meta:
        model = HakedisPeriodSubcontractorDeduction
        fields = [
            "id",
            "subcontractor",
            "subcontractor_name",
            "retainage_amount",
            "advance_deduction",
            "other_deductions",
            "notes",
        ]


class HakedisPeriodSerializer(serializers.ModelSerializer):
    lines = HakedisPeriodLineSerializer(many=True, read_only=True)
    subcontractor_deductions = HakedisPeriodSubcontractorDeductionSerializer(
        many=True, read_only=True
    )
    prepared_by_name = serializers.SerializerMethodField()
    approved_by_name = serializers.SerializerMethodField()

    class Meta:
        model = HakedisPeriod
        fields = [
            "id",
            "site",
            "period_start",
            "period_end",
            "status",
            "prepared_by",
            "prepared_by_name",
            "submitted_at",
            "approved_by",
            "approved_by_name",
            "approved_at",
            "locked_at",
            "total_gross",
            "total_retainage",
            "total_advance_deduction",
            "total_other_deductions",
            "net_payable",
            "approved_payable",
            "notes",
            "lines",
            "subcontractor_deductions",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "prepared_by",
            "submitted_at",
            "approved_by",
            "approved_at",
            "locked_at",
            "total_gross",
            "total_retainage",
            "total_advance_deduction",
            "total_other_deductions",
            "net_payable",
            "created_at",
            "updated_at",
        ]

    def get_prepared_by_name(self, obj) -> str:
        return _user_display(obj.prepared_by)

    def get_approved_by_name(self, obj) -> str:
        return _user_display(obj.approved_by)


class HakedisPeriodCreateSerializer(serializers.ModelSerializer):
    site_id = serializers.IntegerField(write_only=True)

    class Meta:
        model = HakedisPeriod
        fields = ["site_id", "period_start", "period_end", "notes"]


def _user_display(user) -> str:
    if not user:
        return ""
    name = f"{user.first_name} {user.last_name}".strip()
    return name or user.email


class HakedisPeriodUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = HakedisPeriod
        fields = ["notes", "approved_payable"]

    def validate(self, attrs):
        if not self.instance:
            return attrs
        if self.instance.status == HakedisPeriod.Status.PAID:
            raise serializers.ValidationError("Ödenmiş dönem düzenlenemez.")
        if self.instance.is_locked:
            return attrs
        if (
            "approved_payable" in attrs
            and self.instance.status != HakedisPeriod.Status.PENDING_APPROVAL
        ):
            raise serializers.ValidationError(
                {"approved_payable": "Ödeme tutarı yalnızca onay bekleyen dönemde düzenlenebilir."}
            )
        return attrs


class HakedisPeriodDeductionUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = HakedisPeriodSubcontractorDeduction
        fields = ["other_deductions", "notes"]

