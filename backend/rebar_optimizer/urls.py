from django.urls import path

from .views import (
    ProjectDetailView,
    ProjectExportView,
    ProjectListCreateView,
    ProjectOptimizeView,
    ProjectRequirementsView,
    ProjectResultView,
    ProjectUploadView,
    RequirementDetailView,
    TemplateDownloadView,
)

urlpatterns = [
    path("projects/", ProjectListCreateView.as_view(), name="project-list"),
    path("projects/template/", TemplateDownloadView.as_view(), name="project-template"),
    path("projects/<int:pk>/", ProjectDetailView.as_view(), name="project-detail"),
    path(
        "projects/<int:project_id>/requirements/",
        ProjectRequirementsView.as_view(),
        name="project-requirements",
    ),
    path(
        "projects/<int:project_id>/upload/",
        ProjectUploadView.as_view(),
        name="project-upload",
    ),
    path(
        "projects/<int:project_id>/import-xlsx/",
        ProjectUploadView.as_view(),
        name="project-import-xlsx",
    ),
    path(
        "projects/<int:project_id>/optimize/",
        ProjectOptimizeView.as_view(),
        name="project-optimize",
    ),
    path(
        "projects/<int:project_id>/result/",
        ProjectResultView.as_view(),
        name="project-result",
    ),
    path(
        "projects/<int:project_id>/export/<str:fmt>/",
        ProjectExportView.as_view(),
        name="project-export",
    ),
    path(
        "requirements/<int:pk>/",
        RequirementDetailView.as_view(),
        name="requirement-detail",
    ),
]
