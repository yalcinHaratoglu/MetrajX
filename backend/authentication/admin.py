from django.contrib import admin

from .models import ActivationToken, Company, CustomUser, Feedback


@admin.register(Company)
class CompanyAdmin(admin.ModelAdmin):
    list_display = ("name", "tax_number", "created_at")


@admin.register(CustomUser)
class CustomUserAdmin(admin.ModelAdmin):
    list_display = ("email", "first_name", "last_name", "company", "role", "is_active")
    list_filter = ("is_active", "role")
    search_fields = ("email", "first_name", "last_name")
    ordering = ("email",)


@admin.register(ActivationToken)
class ActivationTokenAdmin(admin.ModelAdmin):
    list_display = ("user", "token", "is_used", "created_at")
    list_filter = ("is_used",)


@admin.register(Feedback)
class FeedbackAdmin(admin.ModelAdmin):
    list_display = ("subject", "user", "created_at")
