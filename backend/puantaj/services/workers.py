from django.db.models import Q

from ..models import Worker


def workers_for_site_qs(site_id: int, *, active_only: bool = True):
    qs = Worker.objects.filter(
        Q(subcontractor__site_id=site_id) | Q(site_id=site_id, employment_type=Worker.EmploymentType.DIRECT)
    ).select_related("subcontractor", "site")
    if active_only:
        qs = qs.filter(is_active=True)
    return qs


def worker_belongs_to_site(worker_id: int, site_id: int) -> bool:
    return workers_for_site_qs(site_id, active_only=False).filter(pk=worker_id).exists()
