from django.db import transaction

from authentication.models import CustomUser

from .models import Site, SiteMembership


def sites_for_user(user):
    """Kullanıcının görebileceği şantiye queryset'i."""
    if not user.company_id:
        return Site.objects.none()

    qs = Site.objects.filter(company_id=user.company_id)
    accessible = get_accessible_site_ids_helper(user)
    if accessible is None:
        return qs
    return qs.filter(id__in=accessible)


def get_accessible_site_ids_helper(user) -> list[int] | None:
    if user.role in (
        CustomUser.Role.OWNER,
        CustomUser.Role.ADMIN,
        CustomUser.Role.ACCOUNTANT,
    ):
        return None
    if user.role == CustomUser.Role.SITE_MANAGER:
        return list(user.site_memberships.values_list("site_id", flat=True))
    return []


def user_can_access_site(user, site: Site) -> bool:
    if not user.company_id or site.company_id != user.company_id:
        return False
    accessible = get_accessible_site_ids_helper(user)
    if accessible is None:
        return True
    return site.id in accessible


@transaction.atomic
def assign_user_to_sites(user: CustomUser, site_ids: list[int]) -> None:
    """Şantiye şefinin atandığı şantiyeleri günceller."""
    if user.role != CustomUser.Role.SITE_MANAGER:
        user.site_memberships.all().delete()
        return

    valid_ids = set(
        Site.objects.filter(
            company_id=user.company_id,
            id__in=site_ids,
        ).values_list("id", flat=True)
    )
    user.site_memberships.exclude(site_id__in=valid_ids).delete()
    existing = set(user.site_memberships.values_list("site_id", flat=True))
    to_create = [
        SiteMembership(user=user, site_id=sid)
        for sid in valid_ids
        if sid not in existing
    ]
    if to_create:
        SiteMembership.objects.bulk_create(to_create)
