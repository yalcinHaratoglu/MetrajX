from django.db import migrations


def seed_rebar_and_install(apps, schema_editor):
    AppDefinition = apps.get_model("marketplace", "AppDefinition")
    SiteAppInstallation = apps.get_model("marketplace", "SiteAppInstallation")
    Site = apps.get_model("sites", "Site")

    rebar, _created = AppDefinition.objects.get_or_create(
        slug="rebar",
        defaults={
            "title_key": "nav.rebar",
            "desc_key": "applications.rebar.desc",
            "icon_key": "scissors",
            "route_path": "/apps/rebar",
            "sort_order": 10,
            "is_active": True,
        },
    )

    for site in Site.objects.all():
        SiteAppInstallation.objects.get_or_create(site=site, app=rebar)


def reverse_seed(apps, schema_editor):
    AppDefinition = apps.get_model("marketplace", "AppDefinition")
    AppDefinition.objects.filter(slug="rebar").delete()


class Migration(migrations.Migration):

    dependencies = [
        ("marketplace", "0001_initial"),
    ]

    operations = [
        migrations.RunPython(seed_rebar_and_install, reverse_seed),
    ]
