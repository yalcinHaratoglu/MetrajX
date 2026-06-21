from rest_framework.permissions import BasePermission

from authentication.models import CustomUser


def user_company(user):
    return getattr(user, "company", None)


def is_owner(user) -> bool:
    return user.role == CustomUser.Role.OWNER


def is_accountant(user) -> bool:
    return user.role == CustomUser.Role.ACCOUNTANT


def is_site_manager(user) -> bool:
    return user.role == CustomUser.Role.SITE_MANAGER


def get_accessible_site_ids(user) -> list[int] | None:
    """None = tüm şirket şantiyeleri; list = yalnızca bu ID'ler."""
    if not user_company(user):
        return []
    if is_owner(user) or user.role == CustomUser.Role.ADMIN or is_accountant(user):
        return None
    if is_site_manager(user):
        return list(user.site_memberships.values_list("site_id", flat=True))
    return []


class IsCompanyOwner(BasePermission):
    def has_permission(self, request, view):
        return (
            request.user
            and request.user.is_authenticated
            and is_owner(request.user)
        )


class CanManageTeam(BasePermission):
    """Kullanıcı daveti yalnızca yönetici (owner) yapabilir."""

    def has_permission(self, request, view):
        return (
            request.user
            and request.user.is_authenticated
            and is_owner(request.user)
        )
