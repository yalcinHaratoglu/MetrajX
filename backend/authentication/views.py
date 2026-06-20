from django.contrib.auth import get_user_model
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView

from .emails import send_activation_email, send_invite_email
from .models import ActivationToken, Company
from sites.services import assign_user_to_sites
from sites.permissions import CanManageTeam
from .serializers import (
    ChangePasswordSerializer,
    CompanySerializer,
    FeedbackSerializer,
    RegisterSerializer,
    TeamInviteSerializer,
    TeamMemberSerializer,
    UserProfileSerializer,
    InviteAcceptSerializer,
)

User = get_user_model()


def _get_token_or_none(token_uuid):
    try:
        return ActivationToken.objects.select_related("user", "user__company").get(
            token=token_uuid,
        )
    except ActivationToken.DoesNotExist:
        return None


class RegisterView(generics.CreateAPIView):
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]

    def perform_create(self, serializer):
        user = serializer.save()
        token = ActivationToken.objects.create(
            user=user,
            purpose=ActivationToken.Purpose.REGISTRATION,
        )
        send_activation_email(user, token.token)


class ActivateView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request, token):
        activation = _get_token_or_none(token)
        if not activation:
            return Response(
                {"detail": "Geçersiz aktivasyon bağlantısı."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if activation.purpose == ActivationToken.Purpose.INVITE:
            return Response(
                {
                    "detail": "Bu davet bağlantısı şifre oluşturmak için kullanılmalıdır.",
                    "redirect_to_invite": True,
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        user = activation.user

        # React Strict Mode çift istek veya tekrar tıklama: zaten aktifse başarı döndür.
        if activation.is_used:
            if user.is_active:
                return Response({"detail": "Hesabınız zaten aktifleştirilmiş."})
            return Response(
                {"detail": "Geçersiz veya kullanılmış aktivasyon bağlantısı."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user.is_active = True
        user.save(update_fields=["is_active"])

        activation.is_used = True
        activation.save(update_fields=["is_used"])

        return Response({"detail": "Hesabınız başarıyla aktifleştirildi."})


class InviteAcceptView(APIView):
    """Davet edilen kullanıcı token ile şifre belirler ve organizasyona katılır."""

    permission_classes = [permissions.AllowAny]

    def get(self, request, token):
        activation = _get_token_or_none(token)
        if not activation or activation.purpose != ActivationToken.Purpose.INVITE:
            return Response(
                {"detail": "Geçersiz davet bağlantısı."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user = activation.user
        if activation.is_used and user.is_active and user.has_usable_password():
            return Response(
                {
                    "email": user.email,
                    "first_name": user.first_name,
                    "last_name": user.last_name,
                    "company_name": user.company.name if user.company else "",
                    "role": user.role,
                    "already_accepted": True,
                }
            )

        if activation.is_used:
            return Response(
                {"detail": "Geçersiz veya kullanılmış davet bağlantısı."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(
            {
                "email": user.email,
                "first_name": user.first_name,
                "last_name": user.last_name,
                "company_name": user.company.name if user.company else "",
                "role": user.role,
                "already_accepted": False,
            }
        )

    def post(self, request, token):
        activation = _get_token_or_none(token)
        if not activation or activation.purpose != ActivationToken.Purpose.INVITE:
            return Response(
                {"detail": "Geçersiz davet bağlantısı."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user = activation.user

        if activation.is_used:
            if user.is_active and user.has_usable_password():
                return Response({"detail": "Davet zaten kabul edilmiş."})
            return Response(
                {"detail": "Geçersiz veya kullanılmış davet bağlantısı."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = InviteAcceptSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user.set_password(serializer.validated_data["password"])
        user.is_active = True
        user.save(update_fields=["password", "is_active"])

        activation.is_used = True
        activation.save(update_fields=["is_used"])

        return Response(
            {
                "detail": "Şifreniz oluşturuldu. Artık giriş yapabilirsiniz.",
                "email": user.email,
            }
        )


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
    permission_classes = [CanManageTeam]

    def post(self, request):
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
            role=data.get("role", User.Role.SITE_MANAGER),
            is_active=False,
        )
        user.set_unusable_password()
        user.save()

        if user.role == User.Role.SITE_MANAGER:
            assign_user_to_sites(user, data.get("site_ids") or [])

        token = ActivationToken.objects.create(
            user=user,
            purpose=ActivationToken.Purpose.INVITE,
        )
        company_name = request.user.company.name or "Organizasyon"
        inviter = request.user.get_full_name() or request.user.email
        send_invite_email(user, token.token, company_name, inviter)

        return Response(
            {"detail": "Davet gönderildi.", "email": user.email},
            status=status.HTTP_201_CREATED,
        )


class TeamListView(APIView):
    def get(self, request):
        if not request.user.company:
            return Response([])

        members = (
            User.objects.filter(company=request.user.company)
            .prefetch_related("site_memberships__site")
            .order_by("email")
        )
        return Response(TeamMemberSerializer(members, many=True).data)


class FeedbackView(generics.CreateAPIView):
    serializer_class = FeedbackSerializer

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class HealthView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        return Response({"status": "ok"})
