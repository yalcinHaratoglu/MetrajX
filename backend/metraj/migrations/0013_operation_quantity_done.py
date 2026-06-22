from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("metraj", "0012_seed_company_categories"),
    ]

    operations = [
        migrations.AddField(
            model_name="metrajoperation",
            name="quantity_done",
            field=models.DecimalField(
                decimal_places=3,
                default=0,
                help_text="Tamamlanan miktar (kalem biriminde)",
                max_digits=14,
            ),
        ),
    ]
