from django.db import migrations, models

import daily_log.models


class Migration(migrations.Migration):

    dependencies = [
        ("daily_log", "0001_initial"),
    ]

    operations = [
        migrations.RenameField(
            model_name="dailylogphoto",
            old_name="image",
            new_name="file",
        ),
        migrations.AlterField(
            model_name="dailylogphoto",
            name="file",
            field=models.FileField(upload_to=daily_log.models.daily_log_photo_path),
        ),
        migrations.AddField(
            model_name="dailylogphoto",
            name="original_name",
            field=models.CharField(blank=True, max_length=255),
        ),
    ]
