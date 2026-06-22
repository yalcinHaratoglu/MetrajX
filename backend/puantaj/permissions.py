from django.contrib.auth import get_user_model

User = get_user_model()


def _user_role(user) -> str:
    if not user or not user.is_authenticated:
        return ""
    return user.role


def is_owner_or_admin(user) -> bool:
    role = _user_role(user)
    return role in (User.Role.OWNER, User.Role.ADMIN)


def is_accountant(user) -> bool:
    return _user_role(user) == User.Role.ACCOUNTANT


def is_site_manager(user) -> bool:
    return _user_role(user) == User.Role.SITE_MANAGER


def can_manage_puantaj(user) -> bool:
    """Puantaj oluştur/düzenle/onayla."""
    role = _user_role(user)
    return role in (User.Role.OWNER, User.Role.ADMIN, User.Role.SITE_MANAGER)


def can_prepare_hakedis_period(user) -> bool:
    """Dönem oluştur, hesapla, gönder."""
    return can_manage_puantaj(user)


def can_approve_hakedis_period(user) -> bool:
    """Dönem nihai onay."""
    role = _user_role(user)
    return role in (User.Role.OWNER, User.Role.ADMIN, User.Role.ACCOUNTANT)


def can_manage_contracts(user) -> bool:
    return can_manage_puantaj(user) or is_accountant(user)


def can_manage_advances(user) -> bool:
    return can_approve_hakedis_period(user) or can_manage_puantaj(user)
