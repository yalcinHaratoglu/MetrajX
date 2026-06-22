from decimal import Decimal

from django.db.models import Sum

from metraj.models import MetrajOperation


def recalculate_item_completion(item) -> int:
    done_ops = item.operations.filter(status=MetrajOperation.Status.DONE)
    done_qty = done_ops.aggregate(total=Sum("quantity_done"))["total"] or Decimal("0")

    if item.quantity and item.quantity > 0 and done_qty > 0:
        completion = min(100, int(done_qty / item.quantity * 100))
    else:
        total_percent = done_ops.aggregate(total=Sum("progress_percent"))["total"] or 0
        completion = min(100, int(total_percent))

    if item.completion_percent != completion:
        item.completion_percent = completion
        item.save(update_fields=["completion_percent", "updated_at"])
    return completion
