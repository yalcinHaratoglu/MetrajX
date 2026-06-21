from django.db import migrations

DEFAULT_SLUGS = ("beton", "demir", "siva", "kalip", "boya", "izolasyon")


def mark_system_categories(apps, schema_editor):
    MetrajCategory = apps.get_model("metraj", "MetrajCategory")
    MetrajCategory.objects.filter(slug__in=DEFAULT_SLUGS, company__isnull=True).update(
        is_custom=False
    )


class Migration(migrations.Migration):
    dependencies = [
        ("metraj", "0003_metrajcategory_company_metrajcategory_is_custom_and_more"),
    ]

    operations = [
        migrations.RunPython(mark_system_categories, migrations.RunPython.noop),
    ]
