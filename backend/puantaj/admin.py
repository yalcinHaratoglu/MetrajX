from django.contrib import admin

from .models import (
    AdvancePayment,
    HakedisPeriod,
    HakedisPeriodLine,
    HakedisPeriodSubcontractorDeduction,
    Subcontractor,
    SubcontractorContract,
    Timesheet,
)


@admin.register(Subcontractor)
class SubcontractorAdmin(admin.ModelAdmin):
    list_display = ("name", "site", "category", "is_active")
    list_filter = ("is_active", "site__company")


@admin.register(SubcontractorContract)
class SubcontractorContractAdmin(admin.ModelAdmin):
    list_display = ("subcontractor", "contract_no", "total_amount", "retainage_percent", "status")


@admin.register(AdvancePayment)
class AdvancePaymentAdmin(admin.ModelAdmin):
    list_display = ("subcontractor", "site", "amount", "remaining_balance", "payment_date")


class HakedisPeriodLineInline(admin.TabularInline):
    model = HakedisPeriodLine
    extra = 0


@admin.register(HakedisPeriod)
class HakedisPeriodAdmin(admin.ModelAdmin):
    list_display = ("site", "period_start", "period_end", "status", "net_payable")
    list_filter = ("status", "site")
    inlines = [HakedisPeriodLineInline]


@admin.register(Timesheet)
class TimesheetAdmin(admin.ModelAdmin):
    list_display = ("subcontractor", "date", "worker_count", "status", "site")
    list_filter = ("status", "site__company")
