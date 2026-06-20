from django.conf import settings
from django.core.mail import send_mail


def send_activation_email(user, token):
    activation_url = f"{settings.FRONTEND_URL}/activate/{token}"
    subject = "ConManage — Hesap Aktivasyonu"
    message = (
        f"Merhaba {user.first_name or user.email},\n\n"
        f"ConManage hesabınızı aktifleştirmek için aşağıdaki bağlantıya tıklayın:\n\n"
        f"{activation_url}\n\n"
        f"Bu bağlantı tek kullanımlıktır.\n\n"
        f"ConManage Ekibi"
    )
    send_mail(
        subject,
        message,
        settings.DEFAULT_FROM_EMAIL,
        [user.email],
        fail_silently=False,
    )


def send_invite_email(user, token, company_name: str, inviter_name: str = ""):
    invite_url = f"{settings.FRONTEND_URL}/accept-invite/{token}"
    inviter_line = f"{inviter_name} sizi " if inviter_name else "Sizi "
    subject = "ConManage — Organizasyon Daveti"
    message = (
        f"Merhaba {user.first_name or user.email},\n\n"
        f"{inviter_line}ConManage üzerinde «{company_name}» organizasyonuna "
        f"davet etti.\n\n"
        f"Katılmak için aşağıdaki bağlantıya tıklayıp şifrenizi oluşturun:\n\n"
        f"{invite_url}\n\n"
        f"Bu bağlantı tek kullanımlıktır.\n\n"
        f"ConManage Ekibi"
    )
    send_mail(
        subject,
        message,
        settings.DEFAULT_FROM_EMAIL,
        [user.email],
        fail_silently=False,
    )
