from django.db import migrations


def seed_upcoming_apps(apps, schema_editor):
    AppDefinition = apps.get_model("marketplace", "AppDefinition")
    upcoming = [
        {
            "slug": "safety-checklist",
            "title_key": "applications.upcoming.safety",
            "desc_key": "applications.upcoming.safetyDesc",
            "icon_key": "layout-grid",
            "route_path": "/apps/safety-checklist",
            "sort_order": 20,
            "is_active": True,
        },
        {
            "slug": "quality-inspection",
            "title_key": "applications.upcoming.quality",
            "desc_key": "applications.upcoming.qualityDesc",
            "icon_key": "layout-grid",
            "route_path": "/apps/quality-inspection",
            "sort_order": 30,
            "is_active": True,
        },
    ]
    for app in upcoming:
        AppDefinition.objects.get_or_create(slug=app["slug"], defaults=app)


def reverse_seed(apps, schema_editor):
    AppDefinition = apps.get_model("marketplace", "AppDefinition")
    AppDefinition.objects.filter(
        slug__in=["safety-checklist", "quality-inspection"]
    ).delete()


class Migration(migrations.Migration):

    dependencies = [
        ("marketplace", "0002_seed_rebar_app"),
    ]

    operations = [
        migrations.RunPython(seed_upcoming_apps, reverse_seed),
    ]
