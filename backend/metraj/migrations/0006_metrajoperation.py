import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("metraj", "0005_metrajdocument_item"),
    ]

    operations = [
        migrations.CreateModel(
            name="MetrajOperation",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("title", models.CharField(max_length=255)),
                ("scheduled_date", models.DateField()),
                (
                    "status",
                    models.CharField(
                        choices=[("planned", "Yapılacak"), ("done", "Yapıldı")],
                        default="planned",
                        max_length=20,
                    ),
                ),
                (
                    "progress_percent",
                    models.PositiveSmallIntegerField(
                        default=0,
                        help_text="Tamamlandığında kaleme katkı sağlayan yüzde",
                    ),
                ),
                ("notes", models.TextField(blank=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "item",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="operations",
                        to="metraj.metrajitem",
                    ),
                ),
            ],
            options={
                "ordering": ["scheduled_date", "id"],
            },
        ),
        migrations.AddField(
            model_name="metrajdocument",
            name="operation",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name="documents",
                to="metraj.metrajoperation",
            ),
        ),
    ]
