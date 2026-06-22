# ConManage — Master Mimari ve Yol Haritası (v2)

**Tarih:** 2026-06-21  
**Tek kaynak:** Bu dosya; eski `.cursor/plans/conmanage_erp_donusumu_dd4bd6fd.plan.md` referans içindir.  
**İş akışı detayı:** [`CONMANAGE_IS_AKISLARI.md`](CONMANAGE_IS_AKISLARI.md)

## Uygulama sırası — tamamlandı

| Faz | Durum | Özet |
|-----|-------|------|
| **A + B** | ✅ | Dönemsel hakediş, poz kütüphanesi, onaylı puantaj |
| **C** | ✅ | App Store, `/apps/rebar` |
| **D** | ✅ | Finans/cari, stok, ödeme, bütçe özeti |
| **E** | ✅ | Şantiye takvimi + birleşik API |
| **F** | ✅ | Günlük rapor, demirbaş |
| **G** | ✅ | PageInfoTooltip, sayfa bilgi ipuçları |
| **H** | 🟡 | App Store kataloğunda yakında modüller (ISG, kalite) |

## Modül rotaları (frontend)

| Rota | Modül |
|------|-------|
| `/metraj` | Metraj & İlerleme |
| `/puantaj` | Puantaj & Hakediş dönemleri |
| `/finans` | Cari, stok, ödeme |
| `/takvim` | Birleşik takvim |
| `/gunluk-rapor` | Günlük saha raporu |
| `/demirbas` | Ekipman zimmet |
| `/applications` | App Store |
| `/apps/rebar` | Donatı optimizasyonu |

## Backend uygulamaları

`authentication`, `sites`, `metraj`, `puantaj`, `finans`, `site_calendar`, `daily_log`, `marketplace`, `rebar_optimizer`
