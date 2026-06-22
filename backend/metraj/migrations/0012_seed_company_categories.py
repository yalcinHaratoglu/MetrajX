from django.db import migrations


DEFAULT_CATEGORIES = [
    ("beton", "Beton", "m3", 1),
    ("demir", "Demir", "ton", 2),
    ("siva", "Sıva", "m2", 3),
    ("kalip", "Kalıp", "m2", 4),
    ("boya", "Boya", "m2", 5),
    ("izolasyon", "İzolasyon", "m2", 6),
]


def seed_company_categories(apps, schema_editor):
    Company = apps.get_model("authentication", "Company")
    MetrajCategory = apps.get_model("metraj", "MetrajCategory")
    for company in Company.objects.all():
        for slug, name, unit, order in DEFAULT_CATEGORIES:
            MetrajCategory.objects.get_or_create(
                company_id=company.id,
                slug=slug,
                defaults={
                    "name": name,
                    "default_unit": unit,
                    "sort_order": order,
                    "is_custom": False,
                },
            )


class Migration(migrations.Migration):

    dependencies = [
        ("metraj", "0011_remove_metraj_operation_unique_item_day"),
        ("authentication", "0001_initial"),
    ]

    operations = [
        migrations.RunPython(seed_company_categories, migrations.RunPython.noop),
    ]
