from decimal import Decimal

from metraj.models import MetrajItem


def metraj_item_earned(item: MetrajItem) -> Decimal:
    if item.unit_price is None:
        return Decimal("0")
    return item.quantity * Decimal(item.completion_percent) / Decimal("100") * item.unit_price


def metraj_item_contract_total(item: MetrajItem) -> Decimal:
    if item.unit_price is None:
        return Decimal("0")
    return item.quantity * item.unit_price


def hakedis_line_for_item(item: MetrajItem) -> dict:
    earned = metraj_item_earned(item)
    contract = metraj_item_contract_total(item)
    return {
        "item_id": item.id,
        "description": item.description,
        "category_name": item.category.name,
        "unit": item.unit,
        "quantity": item.quantity,
        "completion_percent": item.completion_percent,
        "unit_price": item.unit_price,
        "contract_amount": contract,
        "earned_amount": earned,
    }


def hakedis_for_subcontractor(subcontractor_id: int) -> dict:
    items = list(
        MetrajItem.objects.filter(subcontractor_id=subcontractor_id)
        .select_related("category", "subcontractor", "site")
        .order_by("category__sort_order", "id")
    )
    if not items:
        return {
            "subcontractor_id": subcontractor_id,
            "subcontractor_name": "",
            "site_id": None,
            "item_count": 0,
            "contract_total": Decimal("0"),
            "earned_total": Decimal("0"),
            "average_progress": 0,
            "items": [],
        }

    sub = items[0].subcontractor
    lines = [hakedis_line_for_item(item) for item in items]
    contract_total = sum((line["contract_amount"] for line in lines), Decimal("0"))
    earned_total = sum((line["earned_amount"] for line in lines), Decimal("0"))
    avg_progress = round(sum(item.completion_percent for item in items) / len(items), 1)

    return {
        "subcontractor_id": sub.id,
        "subcontractor_name": sub.name,
        "site_id": sub.site_id,
        "category_id": sub.category_id,
        "category_name": sub.category.name if sub.category_id else "",
        "item_count": len(items),
        "contract_total": contract_total,
        "earned_total": earned_total,
        "average_progress": avg_progress,
        "items": lines,
    }


def hakedis_for_site(site_id: int) -> dict:
    items = (
        MetrajItem.objects.filter(site_id=site_id, subcontractor__isnull=False)
        .select_related("category", "subcontractor", "subcontractor__category")
        .order_by("subcontractor__name", "category__sort_order", "id")
    )

    by_sub: dict[int, list[MetrajItem]] = {}
    for item in items:
        by_sub.setdefault(item.subcontractor_id, []).append(item)

    lines = []
    grand_contract = Decimal("0")
    grand_earned = Decimal("0")

    for sub_items in by_sub.values():
        sub = sub_items[0].subcontractor
        contract_total = sum(metraj_item_contract_total(i) for i in sub_items)
        earned_total = sum(metraj_item_earned(i) for i in sub_items)
        grand_contract += contract_total
        grand_earned += earned_total
        lines.append(
            {
                "subcontractor_id": sub.id,
                "subcontractor_name": sub.name,
                "category_id": sub.category_id,
                "category_name": sub.category.name if sub.category_id else "",
                "item_count": len(sub_items),
                "contract_total": contract_total,
                "earned_total": earned_total,
                "average_progress": round(
                    sum(i.completion_percent for i in sub_items) / len(sub_items),
                    1,
                ),
            }
        )

    lines.sort(key=lambda row: row["subcontractor_name"].lower())

    return {
        "site_id": site_id,
        "subcontractor_count": len(lines),
        "item_count": items.count(),
        "contract_total": grand_contract,
        "earned_total": grand_earned,
        "lines": lines,
    }
