from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ("metraj", "0010_poztemplate_metrajitem_poz_template"),
    ]

    operations = [
        migrations.RemoveConstraint(
            model_name="metrajoperation",
            name="metraj_operation_unique_item_day",
        ),
    ]
