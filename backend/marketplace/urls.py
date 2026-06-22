from django.urls import path

from .views import (
    AppCatalogView,
    SiteAppInstallationCreateView,
    SiteAppInstallationDeleteView,
    SiteAppInstallationListView,
)

urlpatterns = [
    path("marketplace/catalog/", AppCatalogView.as_view(), name="marketplace-catalog"),
    path("marketplace/installations/", SiteAppInstallationListView.as_view(), name="marketplace-installations"),
    path(
        "marketplace/installations/create/",
        SiteAppInstallationCreateView.as_view(),
        name="marketplace-installations-create",
    ),
    path(
        "marketplace/installations/<int:pk>/",
        SiteAppInstallationDeleteView.as_view(),
        name="marketplace-installations-delete",
    ),
]
