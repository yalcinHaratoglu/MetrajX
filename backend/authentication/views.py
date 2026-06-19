from django.contrib.auth import get_user_model
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView

from .emails import send_activation_email
from .models import ActivationToken, Company
from .serializers import (
    ChangePasswordSerializer,
    CompanySerializer,
    FeedbackSerializer,
    RegisterSerializer,
    TeamInviteSerializer,
    UserProfileSerializer,
)

User = get_user_model()


class RegisterView(generics.CreateAPIView):
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]

    def perform_create(self, serializer):
        user = serializer.save()
        token = ActivationToken.objects.create(user=user)
        send_activation_email(user, token.token)


class ActivateView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request, token):
        try:
            activation = ActivationToken.objects.select_related("user").get(
                token=token,
                is_used=False,
            )
        except ActivationToken.DoesNotExist:
            return Response(
                {"detail": "Geçersiz veya kullanılmış aktivasyon bağlantısı."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user = activation.user
        user.is_active = True
        user.save(update_fields=["is_active"])

        activation.is_used = True
        activation.save(update_fields=["is_used"])

        return Response({"detail": "Hesabınız başarıyla aktifleştirildi."})


class LoginView(TokenObtainPairView):
    permission_classes = [permissions.AllowAny]


class LogoutView(APIView):
    def post(self, request):
        refresh_token = request.data.get("refresh")
        if not refresh_token:
            return Response(
                {"detail": "Refresh token gerekli."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            token = RefreshToken(refresh_token)
            token.blacklist()
        except Exception:
            return Response(
                {"detail": "Geçersiz refresh token."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return Response({"detail": "Başarıyla çıkış yapıldı."})


class ProfileView(generics.RetrieveUpdateAPIView):
    serializer_class = UserProfileSerializer

    def get_object(self):
        return self.request.user


class ChangePasswordView(APIView):
    def post(self, request):
        serializer = ChangePasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user = request.user
        if not user.check_password(serializer.validated_data["current_password"]):
            return Response(
                {"detail": "Mevcut şifre hatalı."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user.set_password(serializer.validated_data["new_password"])
        user.save()
        return Response({"detail": "Şifre başarıyla güncellendi."})


class CompanyView(APIView):
    def get_company(self, user):
        if not user.company:
            return None
        return user.company

    def get(self, request):
        company = self.get_company(request.user)
        if not company:
            return Response(
                {"detail": "Şirket bilgisi bulunamadı."},
                status=status.HTTP_404_NOT_FOUND,
            )
        return Response(CompanySerializer(company).data)

    def patch(self, request):
        company = self.get_company(request.user)
        if not company:
            company = Company.objects.create(name="")
            request.user.company = company
            request.user.save(update_fields=["company"])

        serializer = CompanySerializer(company, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


class TeamInviteView(APIView):
    def post(self, request):
        if request.user.role not in (User.Role.OWNER, User.Role.ADMIN):
            return Response(
                {"detail": "Bu işlem için yetkiniz yok."},
                status=status.HTTP_403_FORBIDDEN,
            )

        serializer = TeamInviteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        if not request.user.company:
            return Response(
                {"detail": "Önce şirket bilgilerinizi oluşturun."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        data = serializer.validated_data
        if User.objects.filter(email=data["email"]).exists():
            return Response(
                {"detail": "Bu e-posta adresi zaten kayıtlı."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user = User.objects.create_user(
            email=data["email"],
            first_name=data.get("first_name", ""),
            last_name=data.get("last_name", ""),
            company=request.user.company,
            role=data.get("role", User.Role.MEMBER),
            is_active=False,
        )
        user.set_unusable_password()
        user.save()

        token = ActivationToken.objects.create(user=user)
        send_activation_email(user, token.token)

        return Response(
            {"detail": "Davet gönderildi.", "email": user.email},
            status=status.HTTP_201_CREATED,
        )


class FeedbackView(generics.CreateAPIView):
    serializer_class = FeedbackSerializer

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class HealthView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        return Response({"status": "ok"})
