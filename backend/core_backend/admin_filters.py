from django.contrib import admin

from authentication.models import Company


class CompanyFilter(admin.SimpleListFilter):
    """Şirket bazlı filtre; boş seçim = tüm şirketler."""

    title = "Şirket"
    parameter_name = "company"

    def lookups(self, request, model_admin):
        options = [("", "Tüm şirketler")]
        for company in Company.objects.order_by("name"):
            options.append((str(company.pk), company.name))
        return options

    def queryset(self, request, queryset):
        if not self.value():
            return queryset
        return queryset.filter(company_id=self.value())


class UserCompanyFilter(admin.SimpleListFilter):
    title = "Şirket"
    parameter_name = "company"

    def lookups(self, request, model_admin):
        options = [("", "Tüm şirketler")]
        for company in Company.objects.order_by("name"):
            options.append((str(company.pk), company.name))
        return options

    def queryset(self, request, queryset):
        if not self.value():
            return queryset
        return queryset.filter(company_id=self.value())


class RelatedUserCompanyFilter(admin.SimpleListFilter):
    """user__company üzerinden filtre (ActivationToken, Feedback vb.)."""

    title = "Şirket"
    parameter_name = "company"

    def lookups(self, request, model_admin):
        options = [("", "Tüm şirketler")]
        for company in Company.objects.order_by("name"):
            options.append((str(company.pk), company.name))
        return options

    def queryset(self, request, queryset):
        if not self.value():
            return queryset
        return queryset.filter(user__company_id=self.value())


class SiteCompanyFilter(admin.SimpleListFilter):
    title = "Şirket"
    parameter_name = "company"

    def lookups(self, request, model_admin):
        options = [("", "Tüm şirketler")]
        for company in Company.objects.order_by("name"):
            options.append((str(company.pk), company.name))
        return options

    def queryset(self, request, queryset):
        if not self.value():
            return queryset
        return queryset.filter(site__company_id=self.value())


class ProjectCompanyFilter(admin.SimpleListFilter):
    title = "Şirket"
    parameter_name = "company"

    def lookups(self, request, model_admin):
        options = [("", "Tüm şirketler")]
        for company in Company.objects.order_by("name"):
            options.append((str(company.pk), company.name))
        return options

    def queryset(self, request, queryset):
        if not self.value():
            return queryset
        return queryset.filter(project__company_id=self.value())
