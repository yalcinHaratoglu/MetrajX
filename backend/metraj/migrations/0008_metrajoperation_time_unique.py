from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("metraj", "0007_remove_system_categories"),
    ]

    operations = [
        migrations.AddField(
            model_name="metrajoperation",
            name="scheduled_time",
            field=models.TimeField(blank=True, null=True),
        ),
        migrations.AddConstraint(
            model_name="metrajoperation",
            constraint=models.UniqueConstraint(
                fields=("item", "scheduled_date"),
                name="metraj_operation_unique_item_day",
            ),
        ),
        migrations.AlterModelOptions(
            name="metrajoperation",
            options={"ordering": ["scheduled_date", "scheduled_time", "id"]},
        ),
    ]
