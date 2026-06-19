from django.core.management.base import BaseCommand

from authentication.models import CustomUser


class Command(BaseCommand):
    help = "MetrajX varsayılan superuser oluşturur (yoksa)"

    def handle(self, *args, **options):
        email = "admin@metrajx.com"
        password = "MetrajX@Admin2024"

        if CustomUser.objects.filter(email=email).exists():
            user = CustomUser.objects.get(email=email)
            user.set_password(password)
            user.is_active = True
            user.is_staff = True
            user.is_superuser = True
            user.save()
            self.stdout.write(self.style.WARNING(f"Superuser güncellendi: {email}"))
        else:
            CustomUser.objects.create_superuser(
                email=email,
                password=password,
                first_name="Admin",
                last_name="MetrajX",
            )
            self.stdout.write(self.style.SUCCESS(f"Superuser oluşturuldu: {email}"))

        self.stdout.write(f"E-posta: {email}")
        self.stdout.write(f"Şifre:  {password}")
        self.stdout.write("Django Admin: http://localhost:8000/admin/")
