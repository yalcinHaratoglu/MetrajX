import django.db.models.deletion
from django.db import migrations, models


def assign_default_category(apps, schema_editor):
    Subcontractor = apps.get_model("puantaj", "Subcontractor")
    MetrajCategory = apps.get_model("metraj", "MetrajCategory")
    for sub in Subcontractor.objects.select_related("site").iterator():
        if sub.category_id:
            continue
        cat = MetrajCategory.objects.filter(company_id=sub.site.company_id).order_by("sort_order", "id").first()
        if cat:
            sub.category_id = cat.id
            sub.save(update_fields=["category_id"])


class Migration(migrations.Migration):

    dependencies = [
        ("metraj", "0009_metrajitem_subcontractor"),
        ("puantaj", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="subcontractor",
            name="category",
            field=models.ForeignKey(
                help_text="Branş — metraj kategorilerinden seçilir",
                null=True,
                on_delete=django.db.models.deletion.PROTECT,
                related_name="subcontractors",
                to="metraj.metrajcategory",
            ),
        ),
        migrations.RunPython(assign_default_category, migrations.RunPython.noop),
        migrations.RemoveField(
            model_name="subcontractor",
            name="trade",
        ),
        migrations.AlterField(
            model_name="subcontractor",
            name="category",
            field=models.ForeignKey(
                help_text="Branş — metraj kategorilerinden seçilir",
                on_delete=django.db.models.deletion.PROTECT,
                related_name="subcontractors",
                to="metraj.metrajcategory",
            ),
        ),
    ]
