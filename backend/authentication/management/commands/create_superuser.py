from django.core.management.base import BaseCommand

from authentication.models import Company, CustomUser
from rebar_optimizer.models import Project
from sites.models import Site


class Command(BaseCommand):
    help = "ConManage varsayılan superuser + demo şirket/şantiye oluşturur (yoksa)"

    def handle(self, *args, **options):
        email = "admin@conmanage.com"
        password = "ConManage@Admin2024"

        company, company_created = Company.objects.get_or_create(
            name="ConManage Demo",
            defaults={"tax_number": "", "address": "Demo adres"},
        )

        if CustomUser.objects.filter(email=email).exists():
            user = CustomUser.objects.get(email=email)
            user.set_password(password)
            user.is_active = True
            user.is_staff = True
            user.is_superuser = True
            user.company = company
            user.role = CustomUser.Role.OWNER
            user.first_name = user.first_name or "Admin"
            user.last_name = user.last_name or "ConManage"
            user.save()
            self.stdout.write(self.style.WARNING(f"Superuser güncellendi: {email}"))
        else:
            user = CustomUser.objects.create_superuser(
                email=email,
                password=password,
                first_name="Admin",
                last_name="ConManage",
            )
            user.company = company
            user.role = CustomUser.Role.OWNER
            user.save(update_fields=["company", "role"])
            self.stdout.write(self.style.SUCCESS(f"Superuser oluşturuldu: {email}"))

        site, site_created = Site.objects.get_or_create(
            company=company,
            name="Demo Şantiye",
            defaults={
                "code": "DEMO",
                "status": Site.Status.ACTIVE,
                "created_by": user,
            },
        )

        project, project_created = Project.objects.get_or_create(
            site=site,
            defaults={
                "company": company,
                "created_by": user,
                "name": site.name,
            },
        )

        from marketplace.services import ensure_default_apps_for_site
        from metraj.services.defaults import ensure_default_categories_for_company

        ensure_default_apps_for_site(site, user)
        ensure_default_categories_for_company(company)

        if company_created:
            self.stdout.write(self.style.SUCCESS(f"Demo şirket oluşturuldu: {company.name}"))
        if site_created:
            self.stdout.write(self.style.SUCCESS(f"Demo şantiye oluşturuldu: {site.name}"))
        if project_created:
            self.stdout.write(self.style.SUCCESS(f"Demo proje bağlandı: {project.name}"))

        self.stdout.write(f"E-posta: {email}")
        self.stdout.write(f"Şifre:  {password}")
        self.stdout.write(f"Şirket: {company.name} (id={company.id})")
        self.stdout.write(f"Şantiye: {site.name} (id={site.id}, proje id={project.id})")
        self.stdout.write("Django Admin: http://localhost:8000/admin/")
