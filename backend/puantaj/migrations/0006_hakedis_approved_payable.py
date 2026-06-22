from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("puantaj", "0005_worker_and_timesheet_worker"),
    ]

    operations = [
        migrations.AddField(
            model_name="hakedisperiod",
            name="approved_payable",
            field=models.DecimalField(
                blank=True,
                decimal_places=2,
                help_text="Onaylanacak gerçek ödeme tutarı; boşsa net_payable kullanılır",
                max_digits=14,
                null=True,
            ),
        ),
    ]
