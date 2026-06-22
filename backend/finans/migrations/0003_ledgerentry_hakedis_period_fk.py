from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("finans", "0002_materialstockitem_materialmovement"),
        ("puantaj", "0006_hakedis_approved_payable"),
    ]

    operations = [
        migrations.AlterField(
            model_name="ledgerentry",
            name="hakedis_period",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="ledger_entries",
                to="puantaj.hakedisperiod",
            ),
        ),
    ]
