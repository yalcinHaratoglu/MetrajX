from django.db import migrations, models


def mark_upcoming_not_installable(apps, schema_editor):
    AppDefinition = apps.get_model("marketplace", "AppDefinition")
    AppDefinition.objects.filter(
        slug__in=["safety-checklist", "quality-inspection"]
    ).update(is_installable=False)


class Migration(migrations.Migration):

    dependencies = [
        ("marketplace", "0003_seed_upcoming_apps"),
    ]

    operations = [
        migrations.AddField(
            model_name="appdefinition",
            name="is_installable",
            field=models.BooleanField(
                default=True,
                help_text="False ise katalogda görünür ama kurulamaz (yakında modüller)",
            ),
        ),
        migrations.RunPython(mark_upcoming_not_installable, migrations.RunPython.noop),
    ]
