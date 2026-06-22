from django.contrib import admin

from .models import LedgerAccount, LedgerEntry, MaterialMovement, MaterialStockItem, Vendor


@admin.register(Vendor)
class VendorAdmin(admin.ModelAdmin):
    list_display = ("name", "company", "subcontractor", "is_active")
    search_fields = ("name",)


@admin.register(LedgerAccount)
class LedgerAccountAdmin(admin.ModelAdmin):
    list_display = ("code", "name", "account_type", "company", "is_system")


@admin.register(LedgerEntry)
class LedgerEntryAdmin(admin.ModelAdmin):
    list_display = ("entry_date", "site", "account", "direction", "amount", "source_type")
    list_filter = ("source_type", "direction")


@admin.register(MaterialStockItem)
class MaterialStockItemAdmin(admin.ModelAdmin):
    list_display = ("name", "site", "quantity_on_hand", "unit")


@admin.register(MaterialMovement)
class MaterialMovementAdmin(admin.ModelAdmin):
    list_display = ("item", "movement_type", "quantity", "movement_date")
