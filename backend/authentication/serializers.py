from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers

from sites.services import assign_user_to_sites

from .models import Company, Feedback

User = get_user_model()


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)
    company_name = serializers.CharField(write_only=True, required=False, allow_blank=True)

    class Meta:
        model = User
        fields = ("email", "password", "first_name", "last_name", "company_name")

    def validate_password(self, value):
        validate_password(value)
        return value

    def create(self, validated_data):
        company_name = validated_data.pop("company_name", "").strip()
        password = validated_data.pop("password")

        company = None
        if company_name:
            company = Company.objects.create(name=company_name)

        user = User.objects.create_user(
            **validated_data,
            password=password,
            company=company,
            role=User.Role.OWNER if company else User.Role.MEMBER,
            is_active=False,
        )
        return user


class UserProfileSerializer(serializers.ModelSerializer):
    company_name = serializers.SerializerMethodField()
    site_ids = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = (
            "id",
            "email",
            "first_name",
            "last_name",
            "role",
            "is_active",
            "company_name",
            "site_ids",
        )
        read_only_fields = ("id", "email", "role", "is_active", "company_name", "site_ids")

    def get_company_name(self, obj):
        if obj.company and obj.company.name:
            return obj.company.name
        return ""

    def get_site_ids(self, obj):
        if obj.role == User.Role.SITE_MANAGER:
            return list(obj.site_memberships.values_list("site_id", flat=True))
        return []


class ChangePasswordSerializer(serializers.Serializer):
    current_password = serializers.CharField(write_only=True)
    new_password = serializers.CharField(write_only=True, min_length=8)

    def validate_new_password(self, value):
        validate_password(value)
        return value


class CompanySerializer(serializers.ModelSerializer):
    class Meta:
        model = Company
        fields = ("id", "name", "tax_number", "address")
        read_only_fields = ("id",)


class TeamInviteSerializer(serializers.Serializer):
    email = serializers.EmailField()
    first_name = serializers.CharField(max_length=150, required=False, allow_blank=True)
    last_name = serializers.CharField(max_length=150, required=False, allow_blank=True)
    role = serializers.ChoiceField(
        choices=[
            User.Role.ADMIN,
            User.Role.SITE_MANAGER,
            User.Role.ACCOUNTANT,
        ],
        default=User.Role.SITE_MANAGER,
    )
    site_ids = serializers.ListField(
        child=serializers.IntegerField(min_value=1),
        required=False,
        allow_empty=True,
    )

    def validate(self, attrs):
        role = attrs.get("role", User.Role.SITE_MANAGER)
        site_ids = attrs.get("site_ids") or []
        if role == User.Role.SITE_MANAGER and not site_ids:
            raise serializers.ValidationError(
                {"site_ids": "Şantiye şefi için en az bir şantiye seçilmelidir."}
            )
        return attrs


class TeamMemberSerializer(serializers.ModelSerializer):
    site_ids = serializers.SerializerMethodField()
    site_names = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = (
            "id",
            "email",
            "first_name",
            "last_name",
            "role",
            "is_active",
            "site_ids",
            "site_names",
        )

    def get_site_ids(self, obj):
        if obj.role == User.Role.SITE_MANAGER:
            return list(obj.site_memberships.values_list("site_id", flat=True))
        return []

    def get_site_names(self, obj):
        if obj.role == User.Role.SITE_MANAGER:
            return list(
                obj.site_memberships.select_related("site").values_list("site__name", flat=True)
            )
        return []


class InviteAcceptSerializer(serializers.Serializer):
    password = serializers.CharField(write_only=True, min_length=8)
    password_confirm = serializers.CharField(write_only=True, min_length=8)

    def validate_password(self, value):
        validate_password(value)
        return value

    def validate(self, attrs):
        if attrs["password"] != attrs["password_confirm"]:
            raise serializers.ValidationError(
                {"password_confirm": "Şifreler eşleşmiyor."}
            )
        return attrs


class FeedbackSerializer(serializers.ModelSerializer):
    class Meta:
        model = Feedback
        fields = ("subject", "message")
