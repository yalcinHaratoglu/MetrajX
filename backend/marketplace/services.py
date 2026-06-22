from django.db.models import Prefetch

from .models import AppDefinition, SiteAppInstallation


def catalog_for_site(site) -> list[dict]:
    """Şantiye için katalog + kurulum durumu."""
    installed = {
        inst.app_id: inst.id
        for inst in SiteAppInstallation.objects.filter(site=site).only("id", "app_id")
    }
    entries = []
    for app in AppDefinition.objects.filter(is_active=True):
        installation_id = installed.get(app.id)
        entries.append(
            {
                "id": app.id,
                "slug": app.slug,
                "title_key": app.title_key,
                "desc_key": app.desc_key,
                "icon_key": app.icon_key,
                "route_path": app.route_path,
                "sort_order": app.sort_order,
                "is_installable": app.is_installable,
                "is_installed": installation_id is not None,
                "installation_id": installation_id,
            }
        )
    return entries


def installed_apps_for_site(site) -> list[SiteAppInstallation]:
    return list(
        SiteAppInstallation.objects.filter(site=site, app__is_active=True)
        .select_related("app")
        .order_by("app__sort_order", "app__slug")
    )


def install_app_for_site(site, app: AppDefinition, user):
    installation, _created = SiteAppInstallation.objects.get_or_create(
        site=site,
        app=app,
        defaults={"installed_by": user},
    )
    return installation


def uninstall_app(installation: SiteAppInstallation) -> None:
    installation.delete()


def ensure_default_apps_for_site(site, user=None) -> None:
    """Yeni şantiyeler için varsayılan uygulamaları kur (rebar)."""
    rebar = AppDefinition.objects.filter(slug="rebar", is_active=True).first()
    if rebar:
        SiteAppInstallation.objects.get_or_create(
            site=site,
            app=rebar,
            defaults={"installed_by": user},
        )
