from django.conf import settings
from django.db import models


class Vendor(models.Model):
    """Tedarikçi / cari kart."""

    company = models.ForeignKey(
        "authentication.Company",
        on_delete=models.CASCADE,
        related_name="vendors",
    )
    subcontractor = models.OneToOneField(
        "puantaj.Subcontractor",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="vendor",
    )
    name = models.CharField(max_length=255)
    tax_number = models.CharField(max_length=32, blank=True)
    contact_phone = models.CharField(max_length=64, blank=True)
    notes = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["name"]
        unique_together = [("company", "name")]

    def __str__(self):
        return self.name


class LedgerAccount(models.Model):
    class AccountType(models.TextChoices):
        PAYABLE = "payable", "Borç (Taşeron)"
        RECEIVABLE = "receivable", "Alacak"
        EXPENSE = "expense", "Gider"
        BANK = "bank", "Banka"

    company = models.ForeignKey(
        "authentication.Company",
        on_delete=models.CASCADE,
        related_name="ledger_accounts",
    )
    code = models.CharField(max_length=32)
    name = models.CharField(max_length=128)
    account_type = models.CharField(max_length=20, choices=AccountType.choices)
    is_system = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["code"]
        unique_together = [("company", "code")]

    def __str__(self):
        return f"{self.code} — {self.name}"


class LedgerEntry(models.Model):
    class Direction(models.TextChoices):
        DEBIT = "debit", "Borç"
        CREDIT = "credit", "Alacak"

    class SourceType(models.TextChoices):
        MANUAL = "manual", "Manuel"
        HAKEDIS_PERIOD = "hakedis_period", "Hakediş Dönemi"
        PAYMENT = "payment", "Ödeme"

    site = models.ForeignKey(
        "sites.Site",
        on_delete=models.CASCADE,
        related_name="ledger_entries",
    )
    account = models.ForeignKey(
        LedgerAccount,
        on_delete=models.PROTECT,
        related_name="entries",
    )
    vendor = models.ForeignKey(
        Vendor,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="entries",
    )
    direction = models.CharField(max_length=10, choices=Direction.choices)
    amount = models.DecimalField(max_digits=14, decimal_places=2)
    entry_date = models.DateField()
    description = models.CharField(max_length=512)
    source_type = models.CharField(
        max_length=32,
        choices=SourceType.choices,
        default=SourceType.MANUAL,
    )
    hakedis_period = models.OneToOneField(
        "puantaj.HakedisPeriod",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="ledger_entry",
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="ledger_entries",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-entry_date", "-id"]
        verbose_name_plural = "ledger entries"

    def __str__(self):
        return f"{self.entry_date} {self.amount} ({self.direction})"


class MaterialStockItem(models.Model):
    site = models.ForeignKey(
        "sites.Site",
        on_delete=models.CASCADE,
        related_name="stock_items",
    )
    name = models.CharField(max_length=255)
    unit = models.CharField(max_length=32, default="adet")
    quantity_on_hand = models.DecimalField(max_digits=14, decimal_places=3, default=0)
    reorder_level = models.DecimalField(max_digits=14, decimal_places=3, null=True, blank=True)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["name"]
        unique_together = [("site", "name")]

    def __str__(self):
        return f"{self.name} ({self.quantity_on_hand} {self.unit})"


class MaterialMovement(models.Model):
    class MovementType(models.TextChoices):
        IN = "in", "Giriş"
        OUT = "out", "Çıkış"

    item = models.ForeignKey(
        MaterialStockItem,
        on_delete=models.CASCADE,
        related_name="movements",
    )
    movement_type = models.CharField(max_length=8, choices=MovementType.choices)
    quantity = models.DecimalField(max_digits=14, decimal_places=3)
    movement_date = models.DateField()
    notes = models.TextField(blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-movement_date", "-id"]

    def __str__(self):
        return f"{self.item.name} {self.movement_type} {self.quantity}"
