import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("sites", "0001_initial"),
        ("puantaj", "0006_hakedis_approved_payable"),
    ]

    operations = [
        migrations.AddField(
            model_name="worker",
            name="site",
            field=models.ForeignKey(
                blank=True,
                help_text="Firma çalışanları için şantiye",
                null=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name="direct_workers",
                to="sites.site",
            ),
        ),
        migrations.AddField(
            model_name="worker",
            name="employment_type",
            field=models.CharField(
                choices=[("subcontractor", "Taşeron işçisi"), ("direct", "Firma çalışanı")],
                default="subcontractor",
                max_length=20,
            ),
        ),
        migrations.AddField(
            model_name="worker",
            name="role",
            field=models.CharField(
                choices=[
                    ("construction_worker", "İnşaat işçisi"),
                    ("security_guard", "Bekçi"),
                    ("foreman", "Formen"),
                    ("other", "Diğer"),
                ],
                default="construction_worker",
                max_length=32,
            ),
        ),
        migrations.AddField(
            model_name="worker",
            name="pay_type",
            field=models.CharField(
                choices=[("daily", "Yevmiye"), ("monthly", "Maaşlı")],
                default="daily",
                max_length=20,
            ),
        ),
        migrations.AlterField(
            model_name="worker",
            name="subcontractor",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name="workers",
                to="puantaj.subcontractor",
            ),
        ),
        migrations.AlterField(
            model_name="timesheet",
            name="subcontractor",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name="timesheets",
                to="puantaj.subcontractor",
            ),
        ),
        migrations.AddConstraint(
            model_name="worker",
            constraint=models.CheckConstraint(
                condition=models.Q(
                    ("employment_type", "subcontractor"),
                    ("subcontractor__isnull", False),
                )
                | models.Q(
                    ("employment_type", "direct"),
                    ("site__isnull", False),
                    ("subcontractor__isnull", True),
                ),
                name="worker_employment_consistency",
            ),
        ),
    ]
