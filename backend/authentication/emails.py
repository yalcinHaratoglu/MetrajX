from django.conf import settings
from django.core.mail import send_mail


def send_activation_email(user, token):
    activation_url = f"{settings.FRONTEND_URL}/activate/{token}"
    subject = "MetrajX — Hesap Aktivasyonu"
    message = (
        f"Merhaba {user.first_name or user.email},\n\n"
        f"MetrajX hesabınızı aktifleştirmek için aşağıdaki bağlantıya tıklayın:\n\n"
        f"{activation_url}\n\n"
        f"Bu bağlantı tek kullanımlıktır.\n\n"
        f"MetrajX Ekibi"
    )
    send_mail(
        subject=subject,
        message=message,
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[user.email],
        fail_silently=False,
    )
