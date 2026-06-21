from django.db import migrations


DEFAULT_SLUGS = ("beton", "demir", "siva", "kalip", "boya", "izolasyon")


def migrate_system_categories_to_companies(apps, schema_editor):
    MetrajCategory = apps.get_model("metraj", "MetrajCategory")
    MetrajItem = apps.get_model("metraj", "MetrajItem")

    system_categories = list(MetrajCategory.objects.filter(company__isnull=True))
    if not system_categories:
        return

    company_ids = set(
        MetrajItem.objects.filter(category__company__isnull=True)
        .values_list("site__company_id", flat=True)
        .distinct()
    )

    replacement_by_company: dict[int, dict[str, int]] = {}
    for company_id in company_ids:
        if not company_id:
            continue
        replacement_by_company[company_id] = {}
        for cat in system_categories:
            new_cat, _ = MetrajCategory.objects.get_or_create(
                company_id=company_id,
                slug=cat.slug,
                defaults={
                    "name": cat.name,
                    "default_unit": cat.default_unit,
                    "sort_order": cat.sort_order,
                    "is_custom": True,
                },
            )
            replacement_by_company[company_id][cat.slug] = new_cat.id

    for item in MetrajItem.objects.filter(category__company__isnull=True).select_related(
        "category", "site"
    ):
        company_id = item.site.company_id
        if not company_id:
            continue
        new_id = replacement_by_company.get(company_id, {}).get(item.category.slug)
        if new_id:
            item.category_id = new_id
            item.save(update_fields=["category"])

    MetrajCategory.objects.filter(company__isnull=True).delete()


class Migration(migrations.Migration):

    dependencies = [
        ("metraj", "0006_metrajoperation"),
    ]

    operations = [
        migrations.RunPython(migrate_system_categories_to_companies, migrations.RunPython.noop),
    ]
