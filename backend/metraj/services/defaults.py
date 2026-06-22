from metraj.models import MetrajCategory

DEFAULT_CATEGORIES = [
    ("beton", "Beton", "m3", 1),
    ("demir", "Demir", "ton", 2),
    ("siva", "Sıva", "m2", 3),
    ("kalip", "Kalıp", "m2", 4),
    ("boya", "Boya", "m2", 5),
    ("izolasyon", "İzolasyon", "m2", 6),
]


def ensure_default_categories_for_company(company) -> None:
    """Yeni şirketler için standart metraj kategorilerini oluşturur."""
    if not company:
        return
    for slug, name, unit, order in DEFAULT_CATEGORIES:
        MetrajCategory.objects.get_or_create(
            company=company,
            slug=slug,
            defaults={
                "name": name,
                "default_unit": unit,
                "sort_order": order,
                "is_custom": False,
            },
        )
