import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("metraj", "0004_mark_system_categories"),
    ]

    operations = [
        migrations.AddField(
            model_name="metrajdocument",
            name="item",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name="documents",
                to="metraj.metrajitem",
            ),
        ),
    ]
