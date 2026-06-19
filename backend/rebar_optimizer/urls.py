from django.urls import path

from .views import (
    ProjectDetailView,
    ProjectListCreateView,
    ProjectOptimizeView,
    ProjectRequirementsView,
)

urlpatterns = [
    path("projects/", ProjectListCreateView.as_view(), name="project-list"),
    path("projects/<int:pk>/", ProjectDetailView.as_view(), name="project-detail"),
    path(
        "projects/<int:project_id>/requirements/",
        ProjectRequirementsView.as_view(),
        name="project-requirements",
    ),
    path(
        "projects/<int:project_id>/optimize/",
        ProjectOptimizeView.as_view(),
        name="project-optimize",
    ),
]
