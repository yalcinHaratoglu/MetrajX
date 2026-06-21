from rest_framework import serializers

from authentication.models import CustomUser

from .models import Site, SiteMembership


class SiteSerializer(serializers.ModelSerializer):
    project_id = serializers.SerializerMethodField()
    requirements_count = serializers.SerializerMethodField()
    metraj_item_count = serializers.IntegerField(read_only=True)
    metraj_average_progress = serializers.FloatField(read_only=True)
    manager_ids = serializers.SerializerMethodField()
    manager_names = serializers.SerializerMethodField()

    class Meta:
        model = Site
        fields = (
            "id",
            "name",
            "code",
            "project_type",
            "client_owner",
            "address",
            "city",
            "parcel_number",
            "status",
            "start_date",
            "planned_end_date",
            "budget_total",
            "currency",
            "manager_ids",
            "manager_names",
            "project_id",
            "requirements_count",
            "metraj_item_count",
            "metraj_average_progress",
            "created_at",
            "updated_at",
        )
        read_only_fields = (
            "id",
            "project_id",
            "requirements_count",
            "metraj_item_count",
            "metraj_average_progress",
            "manager_ids",
            "manager_names",
            "created_at",
            "updated_at",
        )

    def get_project_id(self, obj):
        project = getattr(obj, "rebar_project", None)
        return project.id if project else None

    def get_requirements_count(self, obj):
        project = getattr(obj, "rebar_project", None)
        if not project:
            return 0
        return project.requirements.count()

    def get_manager_ids(self, obj):
        if hasattr(obj, "_prefetched_objects_cache") and "memberships" in obj._prefetched_objects_cache:
            return [m.user_id for m in obj.memberships.all()]
        return list(obj.memberships.values_list("user_id", flat=True))

    def get_manager_names(self, obj):
        if hasattr(obj, "_prefetched_objects_cache") and "memberships" in obj._prefetched_objects_cache:
            memberships = obj.memberships.all()
        else:
            memberships = obj.memberships.select_related("user")
        names = []
        for membership in memberships:
            user = membership.user
            label = f"{user.first_name} {user.last_name}".strip() or user.email
            names.append(label)
        return names


class SiteCreateSerializer(serializers.ModelSerializer):
    manager_ids = serializers.ListField(
        child=serializers.IntegerField(),
        required=False,
        allow_empty=True,
        write_only=True,
    )

    class Meta:
        model = Site
        fields = (
            "id",
            "name",
            "code",
            "project_type",
            "client_owner",
            "address",
            "city",
            "parcel_number",
            "status",
            "start_date",
            "planned_end_date",
            "budget_total",
            "currency",
            "manager_ids",
        )
        read_only_fields = ("id",)

    def validate_code(self, value):
        code = (value or "").strip()
        if not code:
            raise serializers.ValidationError("Şantiye kodu zorunludur.")
        request = self.context.get("request")
        company_id = getattr(getattr(request, "user", None), "company_id", None)
        if company_id:
            qs = Site.objects.filter(company_id=company_id, code__iexact=code)
            if self.instance:
                qs = qs.exclude(pk=self.instance.pk)
            if qs.exists():
                raise serializers.ValidationError("Bu şantiye kodu zaten kullanılıyor.")
        return code

    def validate_manager_ids(self, value):
        if not value:
            return []
        request = self.context.get("request")
        company_id = getattr(getattr(request, "user", None), "company_id", None)
        if not company_id:
            return value
        valid_ids = set(
            CustomUser.objects.filter(
                company_id=company_id,
                id__in=value,
                role=CustomUser.Role.SITE_MANAGER,
                is_active=True,
            ).values_list("id", flat=True)
        )
        invalid = set(value) - valid_ids
        if invalid:
            raise serializers.ValidationError("Geçersiz şantiye şefi seçimi.")
        return list(valid_ids)

    def _sync_managers(self, site, manager_ids):
        SiteMembership.objects.filter(site=site).exclude(user_id__in=manager_ids).delete()
        for user_id in manager_ids:
            SiteMembership.objects.get_or_create(user_id=user_id, site=site)

    def create(self, validated_data):
        manager_ids = validated_data.pop("manager_ids", [])
        site = super().create(validated_data)
        self._sync_managers(site, manager_ids)
        return site

    def update(self, instance, validated_data):
        manager_ids = validated_data.pop("manager_ids", None)
        site = super().update(instance, validated_data)
        if manager_ids is not None:
            self._sync_managers(site, manager_ids)
        return site
