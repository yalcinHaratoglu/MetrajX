# ConManage — Sıfırdan Başlatma ve İş Akışı Test Rehberi

> **Amaç:** Veritabanını sıfırlayıp tüm modülleri uçtan uca manuel test etmek.  
> **Hedef kitle:** Geliştirici / QA / demo hazırlığı  
> **Son güncelleme:** 2026-06-22 (firma çalışanı / puantaj güncellemeleri)  
> **İlgili belgeler:** [`CONMANAGE_IS_AKISLARI.md`](CONMANAGE_IS_AKISLARI.md), [`README.md`](../README.md)

---

## İçindekiler

1. [Ön koşullar](#1-ön-koşullar)
2. [Sistemi sıfırdan başlatma](#2-sistemi-sıfırdan-başlatma)
3. [Otomatik testler](#3-otomatik-testler)
4. [Test kullanıcıları ve roller](#4-test-kullanıcıları-ve-roller)
5. [Ortak test verisi (referans)](#5-ortak-test-verisi-referans)
6. [Senaryo 0 — Giriş ve şantiye seçimi](#senaryo-0--giriş-ve-şantiye-seçimi)
7. [Senaryo 1 — Metraj & ilerleme](#senaryo-1--metraj--ilerleme)
8. [Senaryo 2 — Puantaj & taşeron](#senaryo-2--puantaj--taşeron)
9. [Senaryo 3 — Günlük puantaj matrisi & Excel](#senaryo-3--günlük-puantaj-matrisi--excel)
10. [Senaryo 4 — Hakediş dönemi (tam döngü)](#senaryo-4--hakediş-dönemi-tam-döngü)
11. [Senaryo 5 — Finans & cari](#senaryo-5--finans--cari)
12. [Senaryo 6 — Takvim](#senaryo-6--takvim)
13. [Senaryo 7 — Günlük rapor](#senaryo-7--günlük-rapor)
14. [Senaryo 8 — Demirbaş](#senaryo-8--demirbaş)
15. [Senaryo 9 — Donatı / Uygulamalar](#senaryo-9--donatı--uygulamalar)
16. [Senaryo 10 — Roller ve yetkiler](#senaryo-10--roller-ve-yetkiler)
17. [Senaryo 11 — Onaylı hakediş düzenle / sil](#senaryo-11--onaylı-hakediş-düzenle--sil)
18. [Sorun giderme](#18-sorun-giderme)
19. [Hızlı kontrol listesi](#19-hızlı-kontrol-listesi)

---

## 1. Ön koşullar

| Araç | Minimum |
|------|---------|
| Node.js | 20+ |
| pnpm | 9+ |
| Python | 3.11+ |
| Docker Desktop | Çalışır durumda |
| Tarayıcı | Chrome / Edge (son sürüm) |

Proje kök dizini: `MetrajX/` (ConManage monorepo).

---

## 2. Sistemi sıfırdan başlatma

### 2.1 Tam sıfırlama (önerilen)

Bu komut **PostgreSQL volume'unu siler**, migrasyonları uygular ve demo verisini oluşturur.

```bash
# Proje kökünden
pnpm setup:db
```

**Ne yapar?**

1. `docker compose down -v` → tüm DB verisi silinir  
2. `docker compose up -d` → PostgreSQL yeniden ayağa kalkar  
3. `pnpm migrate` → tüm Django migrasyonları  
4. `pnpm create-superuser` → demo şirket + şantiye + admin kullanıcı  

### 2.2 Ortam dosyası

İlk kurulumda veya `.env` yoksa:

```bash
cp .env.example .env
```

`.env` içinde `DB_PASSWORD=conmanage_dev_secret` olduğundan emin olun (docker-compose ile uyumlu).

### 2.3 Bağımlılıklar (ilk kez veya temiz makine)

```bash
pnpm install

cd backend
python -m venv venv
# Windows:
venv\Scripts\activate
# macOS/Linux:
# source venv/bin/activate
pip install -r requirements.txt
```

### 2.4 Medya dosyalarını temizleme (opsiyonel)

Günlük rapor ekleri, metraj belgeleri vb. yerel dosyalar DB dışında kalır:

```bash
# Windows (Git Bash / PowerShell)
rm -rf backend/media/*
```

### 2.5 Geliştirme sunucularını başlat

```bash
pnpm dev
```

| Servis | URL |
|--------|-----|
| Frontend | http://localhost:5173 |
| Backend API | http://localhost:8000/api |
| Django Admin | http://localhost:8000/admin |

### 2.6 Sıfırlama sonrası varsayılan hesap

`create_superuser` komutu şunları oluşturur/günceller:

| Alan | Değer |
|------|-------|
| E-posta | `admin@conmanage.com` |
| Şifre | `ConManage@Admin2024` |
| Rol | `owner` |
| Şirket | ConManage Demo |
| Şantiye | Demo Şantiye (kod: DEMO) |

> **Not:** `pnpm dev` çalışıyorsa `setup:db` sonrası backend sürecini yeniden başlatın (Ctrl+C → `pnpm dev`).

---

## 3. Otomatik testler

Sıfırlama sonrası regresyon kontrolü:

```bash
# Lint + TypeScript + tüm backend testleri (~71 test)
pnpm check

# Sadece backend
pnpm test:backend

# Belirli modül
cd backend && venv/Scripts/python.exe manage.py test puantaj.tests metraj.tests finans.tests daily_log.tests
```

**Beklenen:** Tüm testler `OK`, exit code `0`.

---

## 4. Test kullanıcıları ve roller

Manuel iş akışı testleri için **3 rol** önerilir. Owner ile **Ayarlar → Ekip** üzerinden davet edin.

| Rol | Kod | Test e-postası (örnek) | Şifre (örnek) |
|-----|-----|------------------------|---------------|
| Müteahhit | `owner` | `admin@conmanage.com` | `ConManage@Admin2024` |
| Şantiye şefi | `site_manager` | `sef@conmanage.com` | `TestPass123!` |
| Muhasebeci | `accountant` | `muhasebe@conmanage.com` | `TestPass123!` |

### Davet adımları (owner ile)

1. **Ayarlar** → **Ekip Yönetimi**
2. **Davet Gönder** → e-posta, ad, rol seç
3. Şantiye şefi için **Demo Şantiye**'yi ata
4. Backend terminalinde **Console EmailBackend** çıktısından davet linkini kopyala  
   (`http://localhost:5173/accept-invite/<uuid>`)
5. Gizli pencerede linki aç → şifre belirle → giriş yap

---

## 5. Ortak test verisi (referans)

Tüm senaryolarda aynı veriyi kullanırsanız sonuçları karşılaştırmak kolaylaşır.

### Şantiye

| Alan | Değer |
|------|-------|
| Ad | Test Şantiyesi (veya Demo Şantiye) |
| Kod | TEST |
| Bütçe (opsiyonel) | 5.000.000 |

### Metraj kategorisi

| Ad | Birim |
|----|-------|
| Beton | m³ |
| Sıva | m² |

### Taşeronlar

| Ad | Kategori | Teminat % |
|----|----------|-----------|
| ABC Beton Ltd. | Beton | 10 |
| XYZ Sıva Ltd. | Sıva | 5 |

### İşçiler (puantaj)

| Ad | Tür | İşveren | Görev | Ücret |
|----|-----|---------|-------|-------|
| Ali Yılmaz | Taşeron işçisi | ABC Beton Ltd. | İnşaat işçisi | Yevmiye |
| Mehmet Bekçi | **Firma çalışanı** | Test Şantiyesi (şantiye adı) | Bekçi | Maaşlı |

> **Firma çalışanı:** Taşerona bağlı değildir; yalnızca günlük puantaj matrisinde takip edilir. Hakediş ve Finans cari akışına **dahil olmaz**.

### Metraj kalemleri

| Açıklama | Kategori | Taşeron | Miktar | Birim fiyat | İlerleme % |
|----------|----------|---------|--------|-------------|------------|
| C25 Temel Betonu | Beton | ABC Beton | 100 | 1.000 ₺ | 0 → 50 → 100 |
| Dış cephe sıvası | Sıva | XYZ Sıva | 500 | 120 ₺ | 0 → 40 |

### Dönem

| Alan | Değer |
|------|-------|
| Hakediş başlangıç | Ayın 1'i |
| Hakediş bitiş | Ayın son günü |
| Test ayı | Haziran 2026 (örnek) |

---

## Senaryo 0 — Giriş, üst bar ve şantiye seçimi

Tüm sayfalarda üst **header** sabittir. Şantiye seçici artık sidebar'da değil, header'dadır.

| # | Yap | Beklenen |
|---|-----|----------|
| 0.1 | http://localhost:5173/login → owner ile giriş | Dashboard açılır |
| 0.2 | **Header** → şantiye seçici (bina ikonu) | Demo Şantiye veya Tüm şantiyeler seçilebilir |
| 0.3 | Şantiye değiştir → Metraj / Puantaj sayfasına git | Seçili şantiye verisi güncellenir |
| 0.4 | Header → **zil ikonu** | Bugünkü takvim olayları ve metraj operasyonları listelenir (şantiye seçiliyse) |
| 0.5 | Takvimde bugün için olay ekle → zile tekrar bak | Rozet sayısı artar, olay listede görünür |
| 0.6 | Zil paneli → **Takvime git** | `/takvim` açılır |
| 0.7 | Header → dil seçici | TR / EN değişir |
| 0.8 | Header → ay/güneş ikonu | Açık / koyu tema değişir |
| 0.9 | Header → **dişli (Ayarlar)** | Doğrudan `/settings` açılır |
| 0.10 | Sol kenar **sidebar rail** butonu (◀ / ▶) | Sidebar gizlenir / açılır; tercih localStorage'da kalır |
| 0.11 | Mobilde (≤768px) header **menü** butonu | Sidebar overlay olarak açılır |
| 0.12 | **Şantiyeler** sayfasına git | Liste ve detay çalışır |

**Not:** Sidebar'da artık şantiye seçici, dil, tema ve Ayarlar menü linki **yok** (üst bara taşındı). Sidebar'da yalnızca navigasyon + çıkış kalır.

**Çıkar / temizle:** Gerek yok.

---

## Senaryo 1 — Metraj & ilerleme

**Sayfa:** `/metraj`

### Hazırlık

| # | Ekle | Nasıl |
|---|------|-------|
| 1.1 | Kategori | Gerekirse yeni kategori (Beton, Sıva) |
| 1.2 | Metraj kalemi | Tablo → **Ekle** veya satır içi düzenleme |
| 1.3 | Taşeron + birim fiyat | Kalem satırında taşeron ve `unit_price` ata |

### İlerleme

| # | Yap | Beklenen |
|---|-----|----------|
| 1.4 | Kaleme tıkla → detay sayfası | `/metraj/items/:id` açılır |
| 1.5 | **Operasyon ekle** (bugün veya seçili tarih) | Operasyon listelenir |
| 1.6 | Operasyonu **Yapıldı** işaretle, `quantity_done` gir | Kalem `completion_percent` artar |
| 1.7 | Metraj özet kartlarına bak | Toplam kalem, tamamlanan % güncellenir |

### Excel (opsiyonel)

| # | Yap | Beklenen |
|---|-----|----------|
| 1.8 | Excel şablonu indir → doldur → içe aktar | Yeni kalemler eklenir veya güncellenir |

### Doğrulama

- Puantaj sayfasındaki **Tahmini Hakediş** banner'ı metraj ilerlemesiyle birlikte artmalı (canlı hesap).
- Formül: `quantity × (completion_percent/100) × unit_price`

**Çıkar:** Bu senaryoda silme zorunlu değil; sonraki senaryolar bu kalemleri kullanır.

---

## Senaryo 2 — Puantaj & taşeron

**Sayfa:** `/puantaj`

### Taşeron sekmesi

| # | Yap | Beklenen |
|---|-----|----------|
| 2.1 | **Taşeronlar** sekmesi → **Ekle** | ABC Beton, XYZ Sıva oluşur |
| 2.2 | Kategori alanı | Metraj kategorilerinden seçim (dropdown) |
| 2.3 | Taşeron oluşturulunca | Finans'ta otomatik **Vendor** (cari kart) oluşur |
| 2.4 | Taşeron listesinde **ara** + sütun filtreleri | Branş, durum vb. ile süzülür |

### İşçi sekmesi

| # | Yap | Beklenen |
|---|-----|----------|
| 2.5 | **İşçiler** → **Ekle** → Tür: **Taşeron işçisi** | Taşeron seçimi zorunlu; kayıt listelenir |
| 2.6 | **İşçiler** → **Ekle** → Tür: **Firma çalışanı** | Taşeron alanı **görünmez**; görev (ör. Bekçi), ücret tipi (Maaşlı) seçilir |
| 2.7 | Firma çalışanı kaydı | Tabloda Tür = Firma çalışanı, İşveren = şantiye adı |
| 2.8 | İşçi listesinde **ara** + sütun filtreleri | Ad, tür, işveren, görev ile süzülür |
| 2.9 | Firma çalışanını düzenle / sil | Liste güncellenir |

### Ay seçici (tüm puantaj sekmeleri)

| # | Yap | Beklenen |
|---|-----|----------|
| 2.10 | Ay çubuğu: **önceki ay** | Geçmiş aya gider (ör. Mayıs 2026) |
| 2.11 | Ay çubuğu: **sonraki ay** | Yalnızca bugünden **önceki veya içinde bulunulan** aya kadar; gelecek ay **kapalı** (Haziran 2026 iken Temmuz 2026'ya gidilemez) |
| 2.12 | **Bu ay** butonu | Güncel aya döner |

### Günlük puantaj sekmesi (eski kayıt akışı — opsiyonel)

| # | Yap | Beklenen |
|---|-----|----------|
| 2.13 | Puantaj satırı ekle: taşeron + tarih + işçi sayısı | Kayıt oluşur, durum `pending` |
| 2.14 | **Onayla** (şef veya owner) | Durum `approved` |

### Avans (hakediş kesintisi testi için)

| # | Yap | Beklenen |
|---|-----|----------|
| 2.15 | Taşerona avans kaydı ekle (ör. 10.000 ₺) | Avans listesinde görünür |

**Kontrol:** Puantaj onayı **parayı değiştirmez**; yalnızca işçi-gün istatistiğidir. **Firma çalışanları** hakediş dönemine ve Finans cari satırlarına **yansımaz**.

---

## Senaryo 3 — Günlük puantaj matrisi & Excel

**Sayfa:** `/puantaj` → **Günlük Puantaj** sekmesi

| # | Yap | Beklenen |
|---|-----|----------|
| 3.1 | Matriste ay 1'den başlamalı (UTC kayması yok) | Sütunlar `1 … 30/31` |
| 3.2 | Hücreye tıkla → geldi/gelmedi işaretle | Puantaj kaydı oluşur/silinir |
| 3.3 | **Taşeron işçisi** ve **firma çalışanı** için aynı matriste işaretle | Her iki tür de satırda görünür |
| 3.4 | Yatay scroll | İşçi ve **İşveren** sütunları sabit kalır, rakam sızması yok |
| 3.5 | **Excel İndir** | `.xlsx` dosyası iner (sütunlar: İşçi, İşveren, Tür, günler, Toplam) |
| 3.6 | **Çalışan türü** filtresi: Firma çalışanı | Yalnızca firma çalışanları (ör. bekçi) listelenir |
| 3.7 | **Çalışan türü** filtresi: Taşeron işçisi | Yalnızca taşeron altı işçiler |
| 3.8 | Taşeron filtresi + arama | Matris filtrelenir (firma filtresindeyken taşeron filtresi gizli) |
| 3.9 | Gelecek güne tıklama | Hücre pasif; puantaj girilemez |
| 3.10 | Ay seçici: gelecek aya ileri ok | Devre dışı (Senaryo 2.11) |

> Excel endpoint: `?export=xlsx` (CSV kullanılmaz).

---

## Senaryo 4 — Hakediş dönemi (tam döngü)

**Sayfa:** `/puantaj` → **Hakediş** sekmesi

### Oluşturma (şef veya owner)

| # | Yap | Beklenen |
|---|-----|----------|
| 4.1 | **Yeni Dönem** → tarih aralığı (ör. 01–30 Haziran) | Taslak oluşur |
| 4.2 | **Oluştur ve Hesapla** | Satırlar: metraj kalemleri, delta %, brüt tutar |
| 4.3 | Kesinti özeti | Teminat, avans mahsubu görünür |
| 4.4 | **Onaya Gönder** | Durum: `Onay Bekliyor` |

### Onay (owner veya muhasebeci)

| # | Yap | Beklenen |
|---|-----|----------|
| 4.5 | Owner ile giriş → dönemi aç | Ödenecek tutar düzenlenebilir |
| 4.6 | **Onayla ve Kilitle** | Durum: `Onaylandı` |
| 4.7 | Metraj ilerlemesini %100 yap | **Onaylı dönem tutarı değişmez** (snapshot) |

### İkinci dönem (delta testi)

| # | Yap | Beklenen |
|---|-----|----------|
| 4.8 | Temmuz dönemi oluştur | `prev_cumulative` önceki onaylı dönemden gelir |
| 4.9 | Brüt tutar | Yalnızca **delta** (yeni ilerleme farkı) hesaplanır |

**Kontrol:** Hakediş satırları yalnızca **metraj kalemi + taşeron** içerir. Senaryo 2.6'daki **firma çalışanı** puantajı hakedişe **yansımaz**.

**Çıkar:** Senaryo 11'de onaylı dönemi silmeden önce Finans senaryosunu tamamlayın.

---

## Senaryo 5 — Finans & cari

**Sayfa:** `/finans`  
**Yetki:** Owner veya Muhasebeci (`site_manager` **erişemez**)

### Hakediş → cari senkron

| # | Yap | Beklenen |
|---|-----|----------|
| 5.1 | Senaryo 4'te onaylanan dönem sonrası Finans'a git | Cari hareketler dolu |
| 5.2 | **Taşeron sütunu** | Her onaylı taşeron için ayrı satır, ad görünür |
| 5.3 | 2 taşeronlu dönem onayladıysanız | **2 ayrı alacak satırı** |
| 5.4 | Özet kartlar | Toplam alacak, borç, bakiye tutarlı |

### Filtre ve ödeme

| # | Yap | Beklenen |
|---|-----|----------|
| 5.5 | Taşeron filtresi | Liste daralır |
| 5.6 | **Ödeme Kaydet** → taşeron seç + tutar | Borç satırı, taşeron adı dolu |
| 5.7 | Sekmeler (Cari / Stok / Ödeme) | Bitişik değil, `metraj-tabs` görünümü |

### Stok (opsiyonel)

| # | Yap | Beklenen |
|---|-----|----------|
| 5.8 | **Depo Stok** → malzeme ekle | Stok kalemi listelenir |

**Kontrol:** Şantiye şefi ile `/finans` → 403 veya erişim engeli.

---

## Senaryo 6 — Takvim

**Sayfa:** `/takvim` (header zilinden de erişilebilir)

| # | Yap | Beklenen |
|---|-----|----------|
| 6.0 | Header zilinde bugünkü olay görünüyor mu kontrol et | Senaryo 0.4–0.6 ile uyumlu |
| 6.1 | Metraj operasyonları takvimde görünür | Planlı / yapıldı noktaları |
| 6.2 | **Olay Ekle** | Tür seçimi **yok** (sadeleştirilmiş UI) |
| 6.3 | Olay kaydet | Tek renk olay noktası |
| 6.4 | Gün detayı | Başlık + saat (tür etiketi yok) |
| 6.5 | Olay düzenle / sil | Liste güncellenir |
| 6.6 | Takvimde ay değiştir (ileri/geri) | Alttaki **Şantiye Olayları** listesi yalnızca **seçili ay** kayıtlarını gösterir |
| 6.7 | Takvim başlığı | **İş Programı** — metraj işleri + şantiye etkinlikleri (yalnızca metraj operasyonları değil) |

---

## Senaryo 7 — Günlük rapor

**Sayfa:** `/gunluk-rapor`

| # | Yap | Beklenen |
|---|-----|----------|
| 7.1 | Sayfa açılışı | Bugün için otomatik taslak oluşabilir |
| 7.2 | **Bu hafta** / **Bu ay** butonları | Liste filtresi değişir |
| 7.3 | Önceki / sonraki ok | Hafta veya ay kayar |
| 7.4 | **Bugünü Düzenle** | Modal açılır, özet düzenlenebilir |
| 7.5 | Özet alanı | Çerçeveli textarea |
| 7.6 | **Dosya Ekle** (PDF, fotoğraf, Excel) | Dosya yüklenir; kartta düzenli satır olarak görünür |
| 7.7 | Rapor **düzenle** → ekli dosyalar listesi | Modalda mevcut dosyalar listelenir |
| 7.8 | Modalda dosya **sil** (çöp kutusu) | Dosya kaldırılır; kart listesi güncellenir |
| 7.9 | Aynı güne tekrar rapor ekleme | 409 yerine düzenleme akışı (çift kayıt yok) |
| 7.10 | Otomatik özet | Tamamlanan metraj + puantaj satırları `[Otomatik]` altında |

**Hava durumu alanı:** UI'da kaldırıldı (backend alanı korunur).

---

## Senaryo 8 — Demirbaş

**Sayfa:** `/demirbas`

| # | Yap | Beklenen |
|---|-----|----------|
| 8.1 | Demirbaş ekle (vinç, kompresör vb.) | Kayıt listelenir |
| 8.2 | Durum değiştir (müsait / zimmetli) | Rozet güncellenir |
| 8.3 | Düzenle / sil | Liste güncellenir |

---

## Senaryo 9 — Donatı / Uygulamalar

**Sayfalar:** `/applications`, `/apps/rebar`

| # | Yap | Beklenen |
|---|-----|----------|
| 9.1 | Uygulamalar kataloğu | Donatı optimizasyonu listelenir |
| 9.2 | Şantiyede kurulu mu kontrol | Demo şantiyede varsayılan kurulu |
| 9.3 | `/apps/rebar` → proje / Excel import | Sayfa açılır (motor varsa optimizasyon) |

---

## Senaryo 10 — Roller ve yetkiler

Aynı veri seti üzerinde **her rol ile ayrı oturum** açın (gizli pencere).

| İşlem | site_manager | owner | accountant |
|-------|:------------:|:-----:|:----------:|
| Metraj düzenle | ✓ | ✓ | — |
| Puantaj oluştur/onayla | ✓ | ✓ | — |
| Hakediş taslak + gönder | ✓ | ✓ | — |
| Hakediş onayla | ✗ | ✓ | ✓ |
| Onaylı hakediş düzenle/sil | ✗ | ✓ | ✓ |
| Finans modülü | ✗ | ✓ | ✓ |
| Ekip daveti | ✗ | ✓ | — |

### Test adımları

| # | Yap | Beklenen |
|---|-----|----------|
| 10.1 | Şef ile hakediş onayla dene | Buton yok veya 403 |
| 10.2 | Şef ile Finans'a git | Erişim yok / boş |
| 10.3 | Muhasebeci ile hakediş onayla | Başarılı |
| 10.4 | Muhasebeci ile Finans | Tam erişim |

---

## Senaryo 11 — Onaylı hakediş düzenle / sil

**Ön koşul:** Senaryo 4 tamamlanmış, en az bir `Onaylandı` dönem var.

### Düzenleme (owner / muhasebeci)

| # | Yap | Beklenen |
|---|-----|----------|
| 11.1 | Hakediş listesinden onaylı dönemi aç | Wizard açılır |
| 11.2 | Notlar ve **Ödenecek Tutar** değiştir | Alanlar düzenlenebilir |
| 11.3 | **Kaydet** | Toast: güncellendi |
| 11.4 | Finans → cari satırları kontrol | Tutarlar yeni `approved_payable` ile uyumlu |

### Silme

| # | Yap | Beklenen |
|---|-----|----------|
| 11.5 | **Sil** → onay penceresi | Uyarı metni görünür |
| 11.6 | Onayla | Dönem listeden kalkar |
| 11.7 | Finans kontrol | İlgili cari kayıtlar silinmiş |
| 11.8 | Avans kullanıldıysa | Avans bakiyesi iade edilmiş |

### Negatif test

| # | Yap | Beklenen |
|---|-----|----------|
| 11.9 | Şef ile onaylı dönem sil | 403 veya buton yok |
| 11.10 | `paid` durumlu dönem (varsa) sil/düzenle | Engellenir |

---

## 18. Sorun giderme

| Belirti | Olası neden | Çözüm |
|---------|-------------|-------|
| DB bağlantı hatası | Docker kapalı / şifre uyumsuz | `pnpm docker:up`, `.env` kontrol |
| `FATAL: password authentication failed` | Eski volume | `pnpm setup:db` |
| API 404 ama kod var | Backend eski süreç | `pnpm dev` yeniden başlat |
| Puantaj export 404 | Eski `export=csv` | `export=xlsx` olmalı (güncel kod) |
| Firma çalışanı hakedişte görünüyor | Yanlış tür / eski veri | Tür = Firma çalışanı; hakediş yalnızca metraj+taşeron |
| Giriş olmuyor | Kullanıcı pasif | `create_superuser` veya aktivasyon linki |
| Davet maili gelmiyor | Dev ortamı | Backend terminalinde e-posta çıktısına bak |
| Finans boş | Dönem onaylanmamış | Hakediş onayı → tekrar kontrol |
| Tarih bir gün kayık | UTC | `toDateKey` kullanan sayfalar güncel mi kontrol |
| Migrasyon hatası | Eksik migration | `pnpm migrate` (`puantaj.0007_worker_direct_employment` firma çalışanı için) |

### Sağlık kontrolleri

```bash
curl http://localhost:8000/api/auth/health/
curl -H "Authorization: Bearer <token>" "http://localhost:8000/api/puantaj/hakedis/?site_id=1"
```

---

## 19. Hızlı kontrol listesi

Tüm sprint / release öncesi tek sayfa özeti:

- [ ] `pnpm setup:db` veya migrate güncel
- [ ] `pnpm check` yeşil
- [ ] Owner giriş + **header** şantiye seçimi
- [ ] Header: zil (bugünkü olaylar), dil, tema, ayarlar kısayolu
- [ ] Sidebar rail: gizle / göster
- [ ] Metraj kalemi + operasyon → ilerleme %
- [ ] Taşeron + **firma çalışanı** (bekçi) + puantaj matrisi
- [ ] Puantaj matrisi: ay 1'den başlar, sticky sütun, **XLSX** iner, tür filtresi
- [ ] Puantaj ay seçici: geçmişe gider, gelecek ay kapalı
- [ ] İşçiler / Taşeronlar: arama + sütun filtreleri
- [ ] Hakediş: taslak → onay → snapshot kilitli
- [ ] Finans: taşeron bazlı cari + ödeme
- [ ] Takvim: olay ekle (tür yok, tek renk); şantiye olayları **ay filtresi**
- [ ] Günlük rapor: hafta/ay, düzenle, dosya ekle/sil (modal)
- [ ] Onaylı hakediş: düzenle + sil (cari geri alınır)
- [ ] Rol testi: şef / muhasebeci sınırları
- [ ] Demirbaş CRUD
- [ ] Donatı uygulaması açılır

---

## Ek: Tam reset + test döngüsü (tek komut dizisi)

```bash
# 1. Sıfırla
pnpm setup:db

# 2. Otomatik test
pnpm check

# 3. Sunucular
pnpm dev

# 4. Tarayıcı
# → http://localhost:5173/login
# → admin@conmanage.com / ConManage@Admin2024
# → Senaryo 0'dan 11'e sırayla

# 5. İsteğe bağlı: medya temizliği sonraki turda
rm -rf backend/media/*
```

---

*Bu rehber manuel QA içindir. Otomatik testler `backend/**/tests/` altında; yeni özellik ekledikçe ilgili senaryo maddesini güncelleyin.*
