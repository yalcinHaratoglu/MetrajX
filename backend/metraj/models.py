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
    description = models.CharField(max_length=255)
    unit = models.CharField(max_length=20, choices=Unit.choices, default=Unit.M2)
    quantity = models.DecimalField(max_digits=14, decimal_places=3, default=0)
    unit_price = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        null=True,
        blank=True,
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
    def total_amount(self):
        if self.unit_price is None:
            return None
        return self.quantity * self.unit_price


def metraj_upload_path(instance, filename):
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
