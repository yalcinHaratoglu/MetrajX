from django.urls import path

from .views import (
    CategoryDetailView,
    CategoryListCreateView,
    MetrajDocumentDetailView,
    MetrajDocumentDownloadView,
    MetrajDocumentListCreateView,
    MetrajExportView,
    MetrajImportView,
    MetrajItemDetailView,
    MetrajItemListCreateView,
    MetrajSummaryView,
    MetrajTemplateView,
)

urlpatterns = [
    path("metraj/categories/", CategoryListCreateView.as_view(), name="metraj-categories"),
    path("metraj/categories/<int:pk>/", CategoryDetailView.as_view(), name="metraj-category-detail"),
    path("metraj/items/", MetrajItemListCreateView.as_view(), name="metraj-items"),
    path("metraj/items/<int:pk>/", MetrajItemDetailView.as_view(), name="metraj-item-detail"),
    path("metraj/summary/", MetrajSummaryView.as_view(), name="metraj-summary"),
    path("metraj/template/", MetrajTemplateView.as_view(), name="metraj-template"),
    path("metraj/import/", MetrajImportView.as_view(), name="metraj-import"),
    path("metraj/export/", MetrajExportView.as_view(), name="metraj-export"),
    path("metraj/documents/", MetrajDocumentListCreateView.as_view(), name="metraj-documents"),
    path("metraj/documents/<int:pk>/", MetrajDocumentDetailView.as_view(), name="metraj-document-detail"),
    path(
        "metraj/documents/<int:pk>/download/",
        MetrajDocumentDownloadView.as_view(),
        name="metraj-document-download",
    ),
]
