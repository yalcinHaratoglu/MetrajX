from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as DjangoUserAdmin

from core_backend.admin_filters import RelatedUserCompanyFilter, UserCompanyFilter

from .models import ActivationToken, Company, CustomUser, Feedback


@admin.register(Company)
class CompanyAdmin(admin.ModelAdmin):
    list_display = ("name", "tax_number", "user_count", "created_at")
    search_fields = ("name", "tax_number")

    @admin.display(description="Kullanıcı")
    def user_count(self, obj):
        return obj.users.count()


@admin.register(CustomUser)
class CustomUserAdmin(DjangoUserAdmin):
    ordering = ("email",)
    list_display = (
        "email",
        "first_name",
        "last_name",
        "company",
        "role",
        "is_active",
        "is_staff",
        "date_joined",
    )
    list_filter = ("is_active", "is_staff", "role", UserCompanyFilter)
    list_editable = ("is_active",)
    search_fields = ("email", "first_name", "last_name")
    readonly_fields = ("date_joined", "last_login")

    fieldsets = (
        (None, {"fields": ("email", "password")}),
        ("Kişisel", {"fields": ("first_name", "last_name")}),
        ("Şirket & Rol", {"fields": ("company", "role")}),
        (
            "Hesap durumu",
            {
                "fields": ("is_active", "is_staff", "is_superuser"),
                "description": "Aktivasyonu elle onaylamak için «Hesap aktif» kutusunu işaretleyin.",
            },
        ),
        ("Tarihler", {"fields": ("last_login", "date_joined")}),
    )
    add_fieldsets = (
        (
            None,
            {
                "classes": ("wide",),
                "fields": ("email", "password1", "password2", "company", "role", "is_active"),
            },
        ),
    )

    actions = ["activate_users", "deactivate_users"]

    @admin.action(description="Seçili kullanıcıları aktifleştir")
    def activate_users(self, request, queryset):
        updated = queryset.update(is_active=True)
        self.message_user(request, f"{updated} kullanıcı aktifleştirildi.")

    @admin.action(description="Seçili kullanıcıları devre dışı bırak")
    def deactivate_users(self, request, queryset):
        updated = queryset.update(is_active=False)
        self.message_user(request, f"{updated} kullanıcı devre dışı bırakıldı.")


@admin.register(ActivationToken)
class ActivationTokenAdmin(admin.ModelAdmin):
    list_display = ("user", "user_company", "purpose", "token", "is_used", "created_at")
    list_filter = ("is_used", "purpose", RelatedUserCompanyFilter)
    search_fields = ("user__email", "token")
    readonly_fields = ("token", "created_at")

    @admin.display(description="Şirket")
    def user_company(self, obj):
        return obj.user.company.name if obj.user.company else "—"


@admin.register(Feedback)
class FeedbackAdmin(admin.ModelAdmin):
    list_display = ("subject", "user", "user_company", "created_at")
    list_filter = (RelatedUserCompanyFilter,)
    search_fields = ("subject", "user__email")

    @admin.display(description="Şirket")
    def user_company(self, obj):
        return obj.user.company.name if obj.user.company else "—"
