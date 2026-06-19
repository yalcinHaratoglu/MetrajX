from django.conf import settings
from django.db import models


class Project(models.Model):
    class Status(models.TextChoices):
        DRAFT = "draft", "Taslak"
        PROCESSING = "processing", "İşleniyor"
        READY = "ready", "Hazır"
        ERROR = "error", "Hata"

    company = models.ForeignKey(
        "authentication.Company",
        on_delete=models.CASCADE,
        related_name="projects",
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="projects",
    )
    name = models.CharField(max_length=255)
    source_file = models.FileField(upload_to="projects/sources/", blank=True, null=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.DRAFT)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return self.name


class Floor(models.Model):
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name="floors")
    name = models.CharField(max_length=100)
    order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["order", "id"]
        unique_together = [("project", "name")]

    def __str__(self):
        return f"{self.project.name} — {self.name}"


class RebarElement(models.Model):
    class ElementType(models.TextChoices):
        COLUMN = "column", "Kolon"
        BEAM = "beam", "Kiriş"
        SLAB = "slab", "Döşeme"
        OTHER = "other", "Diğer"

    floor = models.ForeignKey(Floor, on_delete=models.CASCADE, related_name="elements")
    element_type = models.CharField(max_length=20, choices=ElementType.choices)
    element_number = models.CharField(max_length=64)

    class Meta:
        unique_together = [("floor", "element_number")]

    def __str__(self):
        return self.element_number


class RebarRequirement(models.Model):
    element = models.ForeignKey(
        RebarElement,
        on_delete=models.CASCADE,
        related_name="requirements",
        null=True,
        blank=True,
    )
    project = models.ForeignKey(
        Project,
        on_delete=models.CASCADE,
        related_name="requirements",
    )
    floor = models.ForeignKey(
        Floor,
        on_delete=models.CASCADE,
        related_name="requirements",
        null=True,
        blank=True,
    )
    diameter_mm = models.PositiveIntegerField(help_text="Demir çapı (mm), örn: 16")
    length_m = models.DecimalField(max_digits=8, decimal_places=2, help_text="Boy (metre)")
    quantity = models.PositiveIntegerField(default=1)
    element_ref = models.CharField(max_length=64, blank=True, help_text="K-101, D-203 vb.")
    notes = models.CharField(max_length=255, blank=True)

    class Meta:
        ordering = ["diameter_mm", "-length_m"]

    def __str__(self):
        return f"Ø{self.diameter_mm} — {self.length_m}m × {self.quantity}"


class OptimizationRun(models.Model):
    STANDARD_BAR_LENGTH = 12.0

    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name="optimization_runs")
    bar_length_m = models.DecimalField(max_digits=5, decimal_places=2, default=STANDARD_BAR_LENGTH)
    waste_percent = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]


class CuttingPlan(models.Model):
    run = models.ForeignKey(OptimizationRun, on_delete=models.CASCADE, related_name="cutting_plans")
    diameter_mm = models.PositiveIntegerField()
    stock_bar_index = models.PositiveIntegerField()
    cuts = models.JSONField(default=list)
    waste_m = models.DecimalField(max_digits=8, decimal_places=2, default=0)

    class Meta:
        ordering = ["diameter_mm", "stock_bar_index"]
