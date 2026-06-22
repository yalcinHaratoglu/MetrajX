from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("puantaj", "0004_remove_subcontractor_contract_unit_and_more"),
    ]

    operations = [
        migrations.CreateModel(
            name="Worker",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("first_name", models.CharField(max_length=100)),
                ("last_name", models.CharField(max_length=100)),
                ("national_id", models.CharField(blank=True, max_length=11)),
                (
                    "insurance_status",
                    models.CharField(
                        choices=[
                            ("insured", "Sigortalı"),
                            ("uninsured", "Sigortasız"),
                            ("pending", "Beklemede"),
                        ],
                        default="pending",
                        max_length=20,
                    ),
                ),
                ("phone", models.CharField(blank=True, max_length=32)),
                ("is_active", models.BooleanField(default=True)),
                ("notes", models.TextField(blank=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "subcontractor",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="workers",
                        to="puantaj.subcontractor",
                    ),
                ),
            ],
            options={
                "ordering": ["last_name", "first_name", "id"],
            },
        ),
        migrations.RemoveConstraint(
            model_name="timesheet",
            name="timesheet_unique_subcontractor_day",
        ),
        migrations.AddField(
            model_name="timesheet",
            name="worker",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name="timesheets",
                to="puantaj.worker",
            ),
        ),
        migrations.AddConstraint(
            model_name="timesheet",
            constraint=models.UniqueConstraint(
                condition=models.Q(("worker__isnull", False)),
                fields=("worker", "date"),
                name="timesheet_unique_worker_day",
            ),
        ),
        migrations.AddConstraint(
            model_name="timesheet",
            constraint=models.UniqueConstraint(
                condition=models.Q(("worker__isnull", True)),
                fields=("subcontractor", "date"),
                name="timesheet_unique_subcontractor_day_legacy",
            ),
        ),
    ]
