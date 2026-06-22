from authentication.models import CustomUser

from sites.services import user_can_access_site


def can_manage_site_apps(user) -> bool:
    return user.role in (
        CustomUser.Role.OWNER,
        CustomUser.Role.ADMIN,
        CustomUser.Role.SITE_MANAGER,
    )


def can_manage_site_installation(user, site) -> bool:
    if not can_manage_site_apps(user):
        return False
    return user_can_access_site(user, site)
