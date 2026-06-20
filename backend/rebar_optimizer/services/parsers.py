"""Aşama 1 — Veri Ayıklama (Parsing Engine).

XLSX şablonundan donatı verisini ayıklayıp standart JSON'a çevirir.
(PDF/DXF okuma kapsam dışıdır; yalnızca Excel şablonu ve manuel giriş desteklenir.)

Standart çıktı formatı (her satır):
    {
        "rebar_diameter": 16,      # mm
        "total_length": 4.5,       # metre (tek parça boyu)
        "quantity": 10,            # adet
        "element_ref": "K-101"     # eleman referansı (opsiyonel)
    }
"""

from __future__ import annotations

from typing import IO, Any


def _to_float(value: Any) -> float | None:
    if value is None:
        return None
    try:
        return float(str(value).replace(",", "."))
    except (TypeError, ValueError):
        return None


def _to_int(value: Any) -> int | None:
    parsed = _to_float(value)
    if parsed is None:
        return None
    return int(round(parsed))


def _normalize_length_to_m(length: float) -> float:
    """100'den büyük değerleri cm kabul edip metreye çevirir (ör. 450 -> 4.5)."""
    if length > 100:
        return round(length / 100.0, 3)
    return round(length, 3)


def _make_row(diameter: Any, length: Any, quantity: Any, ref: str = "") -> dict | None:
    diameter_int = _to_int(diameter)
    length_float = _to_float(length)
    if not diameter_int or diameter_int <= 0:
        return None
    if not length_float or length_float <= 0:
        return None
    quantity_int = _to_int(quantity) or 1
    if quantity_int <= 0:
        quantity_int = 1
    return {
        "rebar_diameter": diameter_int,
        "total_length": _normalize_length_to_m(length_float),
        "quantity": quantity_int,
        "element_ref": (ref or "").strip()[:64],
    }


def parse_xlsx(file: IO[bytes] | str) -> list[dict]:
    """ConManage XLSX şablonundan donatı verisini okur.

    Beklenen sütun başlıkları (ilk satır): çap | boy | adet | eleman
    """
    from openpyxl import load_workbook

    workbook = load_workbook(file, read_only=True, data_only=True)
    sheet = workbook.active
    rows: list[dict] = []

    header_seen = False
    for excel_row in sheet.iter_rows(values_only=True):
        if excel_row is None:
            continue
        cells = list(excel_row)
        if not header_seen:
            header_seen = True
            first = str(cells[0] or "").strip().lower()
            if any(key in first for key in ("çap", "cap", "diameter", "ø")):
                continue  # başlık satırını atla
        if all(cell is None for cell in cells):
            continue
        diameter = cells[0] if len(cells) > 0 else None
        length = cells[1] if len(cells) > 1 else None
        quantity = cells[2] if len(cells) > 2 else None
        ref = str(cells[3]).strip() if len(cells) > 3 and cells[3] is not None else ""
        row = _make_row(diameter, length, quantity, ref)
        if row:
            rows.append(row)

    workbook.close()
    return _merge_rows(rows)


def _merge_rows(rows: list[dict]) -> list[dict]:
    """Aynı (çap, boy, eleman) satırlarını adet toplayarak birleştirir."""
    merged: dict[tuple, dict] = {}
    for row in rows:
        key = (row["rebar_diameter"], row["total_length"], row["element_ref"])
        if key in merged:
            merged[key]["quantity"] += row["quantity"]
        else:
            merged[key] = dict(row)
    return list(merged.values())


def parse_file(file: IO[bytes] | str, filename: str) -> list[dict]:
    """Uzantıya göre uygun parser'ı seçer (yalnızca XLSX desteklenir)."""
    name = filename.lower()
    if name.endswith((".xlsx", ".xlsm")):
        return parse_xlsx(file)
    raise ValueError(f"Desteklenmeyen dosya türü: {filename}. Lütfen XLSX şablonu yükleyin.")
