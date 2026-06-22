from django.db import models


class MetrajCategory(models.Model):
    company = models.ForeignKey(
        "authentication.Company",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="metraj_categories",
        help_text="Boş = tüm şirketler için varsayılan kategori",
    )
    slug = models.SlugField(max_length=32)
    name = models.CharField(max_length=100)
    default_unit = models.CharField(max_length=20, default="m2")
    sort_order = models.PositiveIntegerField(default=0)
    is_custom = models.BooleanField(
        default=False,
        help_text="Kullanıcı tarafından eklenen kategori",
    )

    class Meta:
        ordering = ["sort_order", "name"]
        verbose_name_plural = "metraj categories"
        unique_together = [("company", "slug")]

    def __str__(self):
        return self.name


class PozTemplate(models.Model):
    """Şirket bazlı yeniden kullanılabilir poz / kalem şablonu."""

    company = models.ForeignKey(
        "authentication.Company",
        on_delete=models.CASCADE,
        related_name="poz_templates",
    )
    category = models.ForeignKey(
        MetrajCategory,
        on_delete=models.PROTECT,
        related_name="poz_templates",
    )
    description = models.CharField(max_length=255)
    default_unit = models.CharField(max_length=20, default="m2")
    default_unit_price = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        null=True,
        blank=True,
    )
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["category__sort_order", "description", "id"]

    def __str__(self):
        return self.description


class MetrajItem(models.Model):
    class Unit(models.TextChoices):
        M3 = "m3", "m³"
        M2 = "m2", "m²"
        M = "m", "m"
        TON = "ton", "ton"
        ADET = "adet", "adet"
        KG = "kg", "kg"

    site = models.ForeignKey(
        "sites.Site",
        on_delete=models.CASCADE,
        related_name="metraj_items",
    )
    category = models.ForeignKey(
        MetrajCategory,
        on_delete=models.PROTECT,
        related_name="items",
    )
    poz_template = models.ForeignKey(
        PozTemplate,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="metraj_items",
    )
    description = models.CharField(max_length=255)
    unit = models.CharField(max_length=20, choices=Unit.choices, default=Unit.M2)
    quantity = models.DecimalField(max_digits=14, decimal_places=3, default=0)
    unit_price = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="Taşeron sözleşme birim fiyatı (bu kalem için)",
    )
    subcontractor = models.ForeignKey(
        "puantaj.Subcontractor",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="metraj_items",
        help_text="Bu kalemi yürüten taşeron",
    )
    completion_percent = models.PositiveSmallIntegerField(default=0)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["category__sort_order", "id"]

    def __str__(self):
        return f"{self.site.name} — {self.description}"

    @property
    def contract_amount(self):
        """Tamamlanma öncesi toplam sözleşme tutarı: quantity × unit_price."""
        if self.unit_price is None:
            return None
        return self.quantity * self.unit_price

    @property
    def total_amount(self):
        """Hakediş: quantity × (completion_percent / 100) × unit_price."""
        if self.unit_price is None:
            return None
        return self.quantity * self.completion_percent / 100 * self.unit_price


class MetrajOperation(models.Model):
    class Status(models.TextChoices):
        PLANNED = "planned", "Yapılacak"
        DONE = "done", "Yapıldı"

    item = models.ForeignKey(
        MetrajItem,
        on_delete=models.CASCADE,
        related_name="operations",
    )
    title = models.CharField(max_length=255)
    scheduled_date = models.DateField()
    scheduled_time = models.TimeField(null=True, blank=True)
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PLANNED,
    )
    progress_percent = models.PositiveSmallIntegerField(
        default=0,
        help_text="Tamamlandığında kaleme katkı sağlayan yüzde (legacy)",
    )
    quantity_done = models.DecimalField(
        max_digits=14,
        decimal_places=3,
        default=0,
        help_text="Tamamlanan miktar (kalem biriminde)",
    )
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["scheduled_date", "scheduled_time", "id"]

    def __str__(self):
        return f"{self.item.description} — {self.title}"


def metraj_upload_path(instance, filename):
    if instance.operation_id:
        return (
            f"metraj/site_{instance.site_id}/item_{instance.item_id}"
            f"/op_{instance.operation_id}/{filename}"
        )
    if instance.item_id:
        return f"metraj/site_{instance.site_id}/item_{instance.item_id}/{filename}"
    return f"metraj/site_{instance.site_id}/{filename}"


class MetrajDocument(models.Model):
    class FileKind(models.TextChoices):
        EXCEL = "excel", "Excel"
        PDF = "pdf", "PDF"
        WORD = "word", "Word"
        IMAGE = "image", "Görsel"
        OTHER = "other", "Diğer"

    site = models.ForeignKey(
        "sites.Site",
        on_delete=models.CASCADE,
        related_name="metraj_documents",
    )
    item = models.ForeignKey(
        MetrajItem,
        on_delete=models.CASCADE,
        related_name="documents",
        null=True,
        blank=True,
    )
    operation = models.ForeignKey(
        "MetrajOperation",
        on_delete=models.CASCADE,
        related_name="documents",
        null=True,
        blank=True,
    )
    uploaded_by = models.ForeignKey(
        "authentication.CustomUser",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="metraj_uploads",
    )
    file = models.FileField(upload_to=metraj_upload_path)
    original_filename = models.CharField(max_length=255)
    mime_type = models.CharField(max_length=128, blank=True)
    file_kind = models.CharField(
        max_length=20,
        choices=FileKind.choices,
        default=FileKind.OTHER,
    )
    file_size = models.PositiveIntegerField(default=0)
    title = models.CharField(max_length=255, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return self.title or self.original_filename
