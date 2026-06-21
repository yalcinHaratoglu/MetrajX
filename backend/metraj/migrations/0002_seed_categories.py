from django.db import migrations

DEFAULT_CATEGORIES = [
    ("beton", "Beton", "m3", 1),
    ("demir", "Demir", "ton", 2),
    ("siva", "Sıva", "m2", 3),
    ("kalip", "Kalıp", "m2", 4),
    ("boya", "Boya", "m2", 5),
    ("izolasyon", "İzolasyon", "m2", 6),
]


def seed_categories(apps, schema_editor):
    MetrajCategory = apps.get_model("metraj", "MetrajCategory")
    for slug, name, unit, order in DEFAULT_CATEGORIES:
        MetrajCategory.objects.get_or_create(
            slug=slug,
            defaults={"name": name, "default_unit": unit, "sort_order": order},
        )


class Migration(migrations.Migration):
    dependencies = [
        ("metraj", "0001_initial"),
    ]

    operations = [
        migrations.RunPython(seed_categories, migrations.RunPython.noop),
    ]
