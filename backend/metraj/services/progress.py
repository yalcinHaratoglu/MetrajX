from django.db.models import Sum

from metraj.models import MetrajOperation


def recalculate_item_completion(item) -> int:
    total = (
        item.operations.filter(status=MetrajOperation.Status.DONE).aggregate(
            total=Sum("progress_percent")
        )["total"]
        or 0
    )
    completion = min(100, int(total))
    if item.completion_percent != completion:
        item.completion_percent = completion
        item.save(update_fields=["completion_percent", "updated_at"])
    return completion
