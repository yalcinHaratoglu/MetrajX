from django.conf import settings
from django.db import models


class Subcontractor(models.Model):
    site = models.ForeignKey(
        "sites.Site",
        on_delete=models.CASCADE,
        related_name="subcontractors",
    )
    name = models.CharField(max_length=255)
    category = models.ForeignKey(
        "metraj.MetrajCategory",
        on_delete=models.PROTECT,
        related_name="subcontractors",
        help_text="Branş — metraj kategorilerinden seçilir",
    )
    contact_phone = models.CharField(max_length=32, blank=True)
    notes = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["name", "id"]
        unique_together = [("site", "name")]

    def __str__(self):
        return f"{self.site.name} — {self.name}"


class Worker(models.Model):
    class InsuranceStatus(models.TextChoices):
        INSURED = "insured", "Sigortalı"
        UNINSURED = "uninsured", "Sigortasız"
        PENDING = "pending", "Beklemede"

    subcontractor = models.ForeignKey(
        Subcontractor,
        on_delete=models.CASCADE,
        related_name="workers",
    )
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    national_id = models.CharField(max_length=11, blank=True)
    insurance_status = models.CharField(
        max_length=20,
        choices=InsuranceStatus.choices,
        default=InsuranceStatus.PENDING,
    )
    phone = models.CharField(max_length=32, blank=True)
    is_active = models.BooleanField(default=True)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["last_name", "first_name", "id"]

    def __str__(self):
        return f"{self.first_name} {self.last_name}"

    @property
    def full_name(self) -> str:
        return f"{self.first_name} {self.last_name}".strip()


class SubcontractorContract(models.Model):
    class Status(models.TextChoices):
        DRAFT = "draft", "Taslak"
        ACTIVE = "active", "Aktif"
        CLOSED = "closed", "Kapalı"

    subcontractor = models.ForeignKey(
        Subcontractor,
        on_delete=models.CASCADE,
        related_name="contracts",
    )
    contract_no = models.CharField(max_length=64, blank=True)
    total_amount = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    scope = models.TextField(blank=True, help_text="Sözleşme kapsamı")
    retainage_percent = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=0,
        help_text="Teminat kesintisi yüzdesi",
    )
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.ACTIVE,
    )
    start_date = models.DateField(null=True, blank=True)
    end_date = models.DateField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at", "id"]

    def __str__(self):
        return f"{self.subcontractor.name} — {self.contract_no or self.pk}"


class AdvancePayment(models.Model):
    subcontractor = models.ForeignKey(
        Subcontractor,
        on_delete=models.CASCADE,
        related_name="advances",
    )
    site = models.ForeignKey(
        "sites.Site",
        on_delete=models.CASCADE,
        related_name="advance_payments",
    )
    amount = models.DecimalField(max_digits=14, decimal_places=2)
    payment_date = models.DateField()
    remaining_balance = models.DecimalField(max_digits=14, decimal_places=2)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["payment_date", "id"]

    def __str__(self):
        return f"{self.subcontractor.name} — {self.amount} ({self.payment_date})"


class HakedisPeriod(models.Model):
    class Status(models.TextChoices):
        DRAFT = "draft", "Taslak"
        PENDING_APPROVAL = "pending_approval", "Onay Bekliyor"
        APPROVED = "approved", "Onaylandı"
        PAID = "paid", "Ödendi"

    site = models.ForeignKey(
        "sites.Site",
        on_delete=models.CASCADE,
        related_name="hakedis_periods",
    )
    period_start = models.DateField()
    period_end = models.DateField()
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.DRAFT,
    )
    prepared_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="hakedis_periods_prepared",
    )
    submitted_at = models.DateTimeField(null=True, blank=True)
    approved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="hakedis_periods_approved",
    )
    approved_at = models.DateTimeField(null=True, blank=True)
    locked_at = models.DateTimeField(null=True, blank=True)
    total_gross = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    total_retainage = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    total_advance_deduction = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    total_other_deductions = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    net_payable = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    approved_payable = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="Onaylanacak gerçek ödeme tutarı; boşsa net_payable kullanılır",
    )
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-period_end", "-id"]
        constraints = [
            models.UniqueConstraint(
                fields=["site", "period_start", "period_end"],
                name="hakedis_period_unique_site_range",
            ),
        ]

    def __str__(self):
        return f"{self.site.name} — {self.period_start} / {self.period_end} ({self.status})"

    @property
    def is_locked(self) -> bool:
        return self.status in (self.Status.APPROVED, self.Status.PAID)


class HakedisPeriodLine(models.Model):
    period = models.ForeignKey(
        HakedisPeriod,
        on_delete=models.CASCADE,
        related_name="lines",
    )
    metraj_item = models.ForeignKey(
        "metraj.MetrajItem",
        on_delete=models.PROTECT,
        related_name="hakedis_period_lines",
    )
    subcontractor = models.ForeignKey(
        Subcontractor,
        on_delete=models.PROTECT,
        related_name="hakedis_period_lines",
    )
    quantity = models.DecimalField(max_digits=14, decimal_places=3)
    unit_price = models.DecimalField(max_digits=14, decimal_places=2, null=True, blank=True)
    prev_cumulative_percent = models.PositiveSmallIntegerField(default=0)
    current_cumulative_percent = models.PositiveSmallIntegerField(default=0)
    delta_percent = models.PositiveSmallIntegerField(default=0)
    line_gross = models.DecimalField(max_digits=14, decimal_places=2, default=0)

    class Meta:
        ordering = ["subcontractor__name", "metraj_item__id"]
        constraints = [
            models.UniqueConstraint(
                fields=["period", "metraj_item"],
                name="hakedis_period_line_unique_item",
            ),
        ]

    def __str__(self):
        return f"{self.period_id} — {self.metraj_item_id}"


class HakedisPeriodSubcontractorDeduction(models.Model):
    period = models.ForeignKey(
        HakedisPeriod,
        on_delete=models.CASCADE,
        related_name="subcontractor_deductions",
    )
    subcontractor = models.ForeignKey(
        Subcontractor,
        on_delete=models.CASCADE,
        related_name="hakedis_deductions",
    )
    retainage_amount = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    advance_deduction = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    other_deductions = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    notes = models.TextField(blank=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["period", "subcontractor"],
                name="hakedis_deduction_unique_sub",
            ),
        ]

    def __str__(self):
        return f"{self.period_id} — {self.subcontractor.name}"


class Timesheet(models.Model):
    class Status(models.TextChoices):
        PENDING = "pending", "Bekliyor"
        APPROVED = "approved", "Onaylandı"
        DISPUTED = "disputed", "İtirazlı"

    site = models.ForeignKey(
        "sites.Site",
        on_delete=models.CASCADE,
        related_name="timesheets",
    )
    subcontractor = models.ForeignKey(
        Subcontractor,
        on_delete=models.CASCADE,
        related_name="timesheets",
    )
    worker = models.ForeignKey(
        Worker,
        on_delete=models.CASCADE,
        related_name="timesheets",
        null=True,
        blank=True,
    )
    date = models.DateField()
    worker_count = models.PositiveSmallIntegerField(default=1)
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING,
    )
    approved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="timesheets_approved",
    )
    approved_at = models.DateTimeField(null=True, blank=True)
    notes = models.TextField(blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="timesheets_created",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-date", "-id"]
        constraints = [
            models.UniqueConstraint(
                fields=["worker", "date"],
                condition=models.Q(worker__isnull=False),
                name="timesheet_unique_worker_day",
            ),
            models.UniqueConstraint(
                fields=["subcontractor", "date"],
                condition=models.Q(worker__isnull=True),
                name="timesheet_unique_subcontractor_day_legacy",
            ),
        ]

    def __str__(self):
        return f"{self.subcontractor.name} — {self.date}"
