from django.db import migrations, models


def fill_empty_codes(apps, schema_editor):
    Site = apps.get_model("sites", "Site")
    for site in Site.objects.filter(code=""):
        site.code = f"LEGACY-{site.pk}"
        site.save(update_fields=["code"])


class Migration(migrations.Migration):

    dependencies = [
        ("sites", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="site",
            name="city",
            field=models.CharField(blank=True, max_length=100),
        ),
        migrations.AddField(
            model_name="site",
            name="client_owner",
            field=models.CharField(blank=True, help_text="İşveren / mal sahibi", max_length=255),
        ),
        migrations.AddField(
            model_name="site",
            name="currency",
            field=models.CharField(
                choices=[("TRY", "TRY"), ("USD", "USD"), ("EUR", "EUR")],
                default="TRY",
                max_length=3,
            ),
        ),
        migrations.AddField(
            model_name="site",
            name="parcel_number",
            field=models.CharField(blank=True, help_text="Ada / parsel numarası", max_length=64),
        ),
        migrations.AddField(
            model_name="site",
            name="project_type",
            field=models.CharField(
                blank=True,
                choices=[
                    ("residential", "Konut"),
                    ("commercial", "Ticari"),
                    ("industrial", "Endüstriyel"),
                    ("infrastructure", "Altyapı/Yol"),
                ],
                max_length=20,
            ),
        ),
        migrations.RunPython(fill_empty_codes, migrations.RunPython.noop),
        migrations.AlterField(
            model_name="site",
            name="code",
            field=models.CharField(help_text="Benzersiz şantiye kodu, örn: CM-2026-001", max_length=32),
        ),
        migrations.AlterUniqueTogether(
            name="site",
            unique_together={("company", "name"), ("company", "code")},
        ),
    ]
