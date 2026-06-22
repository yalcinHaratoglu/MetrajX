from django.urls import path

from .views import (
    AssetDetailView,
    AssetListCreateView,
    DailyLogDetailView,
    DailyLogListCreateView,
    DailyLogPhotoDeleteView,
    DailyLogPhotoUploadView,
    DailyLogTodayView,
)

urlpatterns = [
    path("daily-logs/", DailyLogListCreateView.as_view(), name="daily-logs"),
    path("daily-logs/today/", DailyLogTodayView.as_view(), name="daily-log-today"),
    path("daily-logs/<int:pk>/", DailyLogDetailView.as_view(), name="daily-log-detail"),
    path("daily-logs/<int:pk>/photos/", DailyLogPhotoUploadView.as_view(), name="daily-log-photo"),
    path(
        "daily-logs/<int:pk>/photos/<int:photo_id>/",
        DailyLogPhotoDeleteView.as_view(),
        name="daily-log-photo-delete",
    ),
    path("assets/", AssetListCreateView.as_view(), name="assets"),
    path("assets/<int:pk>/", AssetDetailView.as_view(), name="asset-detail"),
]
