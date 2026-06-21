"""Django admin: oturum bazlı firma seçici ve queryset filtreleme."""

from django.contrib.admin.sites import AdminSite

from authentication.models import Company

SESSION_KEY = "admin_company_id"
ALL_COMPANIES = "all"


def get_selected_company_id(request) -> str:
    return request.session.get(SESSION_KEY, ALL_COMPANIES)


def set_selected_company_id(request, company_id: str) -> None:
    request.session[SESSION_KEY] = company_id or ALL_COMPANIES


class AdminCompanyScopeMiddleware:
    """Admin isteklerinde ?admin_company= parametresini oturuma yazar."""

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if (
            request.path.startswith("/admin/")
            and hasattr(request, "user")
            and request.user.is_authenticated
            and request.user.is_staff
            and "admin_company" in request.GET
        ):
            set_selected_company_id(request, request.GET.get("admin_company") or ALL_COMPANIES)
        return self.get_response(request)


class CompanyScopedAdminMixin:
    """Seçili firmaya göre changelist queryset'ini filtreler."""

    company_filter_field = "company_id"

    def get_queryset(self, request):
        qs = super().get_queryset(request)
        company_id = get_selected_company_id(request)
        if not company_id or company_id == ALL_COMPANIES:
            return qs
        try:
            cid = int(company_id)
        except (TypeError, ValueError):
            return qs
        return qs.filter(**{self.company_filter_field: cid})


_original_each_context = AdminSite.each_context


def _patched_each_context(self, request):
    context = _original_each_context(self, request)
    if request.user.is_authenticated and request.user.is_staff:
        context["admin_companies"] = Company.objects.order_by("name")
        context["admin_selected_company"] = get_selected_company_id(request)
    else:
        context["admin_companies"] = []
        context["admin_selected_company"] = ALL_COMPANIES
    return context


def patch_admin_site():
    AdminSite.each_context = _patched_each_context
