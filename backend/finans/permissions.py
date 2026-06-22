from authentication.models import CustomUser


def can_access_finans(user) -> bool:
    return user.role in (
        CustomUser.Role.OWNER,
        CustomUser.Role.ADMIN,
        CustomUser.Role.ACCOUNTANT,
    )
