from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView

from .views import (
    ActivateView,
    ChangePasswordView,
    CompanyView,
    FeedbackView,
    HealthView,
    LoginView,
    LogoutView,
    ProfileView,
    RegisterView,
    TeamInviteView,
    TeamListView,
)

urlpatterns = [
    path("health/", HealthView.as_view(), name="health"),
    path("register/", RegisterView.as_view(), name="register"),
    path("activate/<uuid:token>/", ActivateView.as_view(), name="activate"),
    path("login/", LoginView.as_view(), name="login"),
    path("logout/", LogoutView.as_view(), name="logout"),
    path("token/refresh/", TokenRefreshView.as_view(), name="token-refresh"),
    path("profile/", ProfileView.as_view(), name="profile"),
    path("change-password/", ChangePasswordView.as_view(), name="change-password"),
    path("company/", CompanyView.as_view(), name="company"),
    path("team/invite/", TeamInviteView.as_view(), name="team-invite"),
    path("team/", TeamListView.as_view(), name="team-list"),
    path("feedback/", FeedbackView.as_view(), name="feedback"),
]
