from django.contrib import admin
from django.urls import include, path

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/auth/", include("authentication.urls")),
    path("api/", include("sites.urls")),
    path("api/", include("rebar_optimizer.urls")),
]
