# MetrajX

İnşaat projelerinde donatı metrajı, kesim optimizasyonu ve şantiye planlaması için SaaS platformu.

## Mimari

```
MetrajX/
├── frontend/     → React + Vite + TypeScript (pnpm)
├── backend/      → Django REST Framework + PostgreSQL
├── docker-compose.yml
└── pnpm-workspace.yaml
```

### Ortamlar

| Ortam | Frontend | Backend | Veritabanı |
|-------|----------|---------|------------|
| Local | Vite `:5173` | Django `:8000` | Docker PostgreSQL |
| Production | Vercel | Render | Neon.tech |

## Ön Gereksinimler

- [Node.js](https://nodejs.org/) 20+
- [pnpm](https://pnpm.io/) 9+
- [Python](https://www.python.org/) 3.11+
- [Docker Desktop](https://www.docker.com/products/docker-desktop/)

## Kurulum (Local)

### 1. Ortam değişkenlerini ayarlayın

```bash
cp .env.example .env
```

`.env` dosyasında `DB_PASSWORD` değerini kontrol edin (varsayılan: `metrajx_dev_secret`).

### 2. PostgreSQL servisini başlatın

```bash
docker compose up -d
docker compose ps   # metrajx-db "healthy" olmalı
```

### 3. Bağımlılıkları kurun

```bash
pnpm install

cd backend
python -m venv venv
# Windows:
venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

pip install -r requirements.txt
```

### 4. Veritabanı migrasyonlarını çalıştırın

```bash
# backend/venv aktifken veya kök dizinden:
pnpm migrate
```

### 5. Geliştirme sunucularını başlatın

```bash
# Kök dizinden — frontend + backend birlikte:
pnpm dev

# Veya ayrı ayrı:
pnpm dev:frontend   # http://localhost:5173
pnpm dev:backend    # http://localhost:8000
```

## API Endpoints (Auth)

| Method | Endpoint | Açıklama |
|--------|----------|----------|
| POST | `/api/auth/register/` | Kayıt (is_active=False) |
| GET | `/api/auth/activate/<uuid>/` | Hesap aktivasyonu |
| POST | `/api/auth/login/` | JWT access + refresh |
| POST | `/api/auth/logout/` | Çıkış (token blacklist) |
| POST | `/api/auth/token/refresh/` | Token yenileme |
| GET/PATCH | `/api/auth/profile/` | Profil |
| POST | `/api/auth/change-password/` | Şifre değiştirme |
| GET/PATCH | `/api/auth/company/` | Şirket bilgileri |
| POST | `/api/auth/team/invite/` | Ekip daveti |
| POST | `/api/auth/feedback/` | Geri bildirim |
| GET | `/api/auth/health/` | Sağlık kontrolü |
| GET/POST | `/api/projects/` | Proje listesi / oluşturma |
| GET/PATCH/DELETE | `/api/projects/{id}/` | Proje detay |
| GET/POST | `/api/projects/{id}/requirements/` | Demir girişi |
| POST | `/api/projects/{id}/optimize/` | Kesim optimizasyonu (501 — motor hazırlanıyor) |

## Git Commit

```bash
pnpm commit
```

İnteraktif sihirbaz: tip → kapsam (frontend/backend/all) → mesaj  
Örnek çıktı: `feat(backend): add rebar optimizer models`

Manuel commit için aynı format zorunludur (commitlint).

Kayıt sonrası aktivasyon e-postası geliştirme ortamında **terminal/konsola** yazdırılır.

### Superuser (Admin)

```bash
cd backend
venv\Scripts\python.exe manage.py create_superuser
```

| Alan | Değer |
|------|-------|
| E-posta | `admin@metrajx.com` |
| Şifre | `MetrajX@Admin2024` |

- Django Admin: http://localhost:8000/admin/
- API login: http://localhost:5173/login

## Git Hooks (Husky)

| Hook | Ne yapar? |
|------|-----------|
| `pre-commit` | ESLint + TypeScript + backend testleri (`pnpm check`) |
| `commit-msg` | Commitlint — conventional commit formatı zorunlu |
| `pre-push` | Tam test suite (`pnpm test`) — build dahil |

Commit mesajı örneği: `feat: add settings page` veya `fix: resolve login redirect`

## Canlı Ortam (Production)

### Neon — Veritabanı

1. [neon.tech](https://neon.tech) üzerinde `metrajx-prod` projesi oluşturun
2. Connection string'i kopyalayın
3. Render ortam değişkenine `DATABASE_URL` olarak ekleyin

### Render — Backend API

- `render.yaml` dosyası kök dizinde hazır
- GitHub repo bağlayın → Web Service deploy
- Gerekli env: `DATABASE_URL`, `SECRET_KEY`, `FRONTEND_URL`, `CORS_ALLOWED_ORIGINS`

### Vercel — Frontend

- Root Directory: `frontend`
- Build: `pnpm build`
- Env: `VITE_API_URL=https://metrajx-api.onrender.com/api`

## Proje Fazları

- **Phase 1:** Core Rebar Optimization & Cutting Stock Algorithm
- **Phase 2:** Automated Formwork (Kalıp) & Wall (Duvar) area estimations from DXF layers
- **Phase 3:** Opening deduction (Minha) algorithms for doors and windows
- **Phase 4:** Comprehensive Bill of Quantities (BoQ) export for plaster, paint, and concrete

## Faydalı Komutlar

```bash
pnpm docker:up      # PostgreSQL başlat
pnpm docker:down    # PostgreSQL durdur
pnpm migrate        # Django migrasyonları
pnpm dev            # Frontend + Backend
```
