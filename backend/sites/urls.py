from django.urls import path

from .views import MySitesView, SiteDetailView, SiteListCreateView

urlpatterns = [
    path("sites/", SiteListCreateView.as_view(), name="site-list"),
    path("sites/mine/", MySitesView.as_view(), name="site-mine"),
    path("sites/<int:pk>/", SiteDetailView.as_view(), name="site-detail"),
]
