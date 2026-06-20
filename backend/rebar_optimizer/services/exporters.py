"""Aşama 3 — Raporlama (Export Engine).

Optimizasyon sonucunu Excel (openpyxl) formatında sunar: çap bazlı metraj,
çubuk ve fire özeti + kesim planı. Ayrıca kullanıcının doldurabileceği boş
XLSX şablonu üretir. (PDF çıktısı kapsam dışıdır.)
"""

from __future__ import annotations

import io


TEMPLATE_HEADERS = ["Çap (mm)", "Boy (m)", "Adet", "Eleman No"]
TEMPLATE_EXAMPLES = [
    [16, 4.5, 10, "K-101"],
    [12, 3.0, 24, "K-102"],
    [8, 2.4, 50, "D-201"],
]


def _group_bars(bars: list[dict]) -> list[dict]:
    """Aynı kesim desenine sahip çubukları gruplar: {bar, count}.

    Aynı (boy + eleman no) sırası ve fire değerine sahip çubuklar tek satırda
    "×N" olarak gösterilir; böylece çok sayıda özdeş çubuk tekrar etmez.
    """
    groups: list[dict] = []
    index: dict[tuple, int] = {}
    for bar in bars:
        signature = (
            tuple((cut["length"], cut.get("element_ref", "")) for cut in bar["cuts"]),
            bar["waste_m"],
        )
        if signature in index:
            groups[index[signature]]["count"] += 1
        else:
            index[signature] = len(groups)
            groups.append({"bar": bar, "count": 1})
    return groups


def _cuts_label(cuts: list[dict]) -> str:
    """Bir çubuğun kesimlerini 'boy ×adet (no)' biçiminde özetler."""
    parts: list[str] = []
    run: list[dict] = []

    def flush():
        if not run:
            return
        length = run[0]["length"]
        ref = run[0].get("element_ref", "")
        count = len(run)
        text = f"{length}" + (f"×{count}" if count > 1 else "")
        if ref:
            text += f" ({ref})"
        parts.append(text)

    for cut in cuts:
        if run and (
            cut["length"] == run[0]["length"]
            and cut.get("element_ref", "") == run[0].get("element_ref", "")
        ):
            run.append(cut)
        else:
            flush()
            run = [cut]
    flush()
    return " + ".join(parts)


def _diameter_summary(result: dict) -> list[dict]:
    """Her çap için metraj/çubuk/fire özetini hesaplar."""
    summary: list[dict] = []
    bar_length_m = float(result.get("bar_length_m", 12.0))

    for diameter, bars in sorted(result.get("plans", {}).items(), key=lambda kv: int(kv[0])):
        total_pieces = sum(len(bar["cuts"]) for bar in bars)
        total_cut_m = sum(cut["length"] for bar in bars for cut in bar["cuts"])
        waste_m = sum(bar["waste_m"] for bar in bars)
        bar_count = len(bars)
        stock_m = bar_count * bar_length_m
        waste_percent = round((waste_m / stock_m) * 100, 2) if stock_m else 0.0
        summary.append(
            {
                "diameter": int(diameter),
                "pieces": total_pieces,
                "cut_length_m": round(total_cut_m, 2),
                "bars": bar_count,
                "stock_length_m": round(stock_m, 2),
                "waste_m": round(waste_m, 2),
                "waste_percent": waste_percent,
            }
        )
    return summary


def build_template() -> io.BytesIO:
    """Donatı girişi için boş XLSX şablonu üretir."""
    from openpyxl import Workbook
    from openpyxl.styles import Font, PatternFill

    workbook = Workbook()
    sheet = workbook.active
    sheet.title = "Donati"

    header_fill = PatternFill(start_color="0284C7", end_color="0284C7", fill_type="solid")
    header_font = Font(color="FFFFFF", bold=True)

    for col, header in enumerate(TEMPLATE_HEADERS, start=1):
        cell = sheet.cell(row=1, column=col, value=header)
        cell.fill = header_fill
        cell.font = header_font

    for row_idx, example in enumerate(TEMPLATE_EXAMPLES, start=2):
        for col, value in enumerate(example, start=1):
            sheet.cell(row=row_idx, column=col, value=value)

    widths = [12, 12, 10, 16]
    for col, width in enumerate(widths, start=1):
        sheet.column_dimensions[chr(64 + col)].width = width

    buffer = io.BytesIO()
    workbook.save(buffer)
    buffer.seek(0)
    return buffer


def export_excel(project_name: str, result: dict) -> io.BytesIO:
    """Optimizasyon sonucunu profesyonel bir Excel raporuna çevirir."""
    from openpyxl import Workbook
    from openpyxl.styles import Alignment, Font, PatternFill

    workbook = Workbook()
    header_fill = PatternFill(start_color="0F172A", end_color="0F172A", fill_type="solid")
    header_font = Font(color="FFFFFF", bold=True)
    title_font = Font(size=14, bold=True)

    # --- Özet sayfası ---
    summary_sheet = workbook.active
    summary_sheet.title = "Özet"
    summary_sheet["A1"] = f"ConManage — {project_name}"
    summary_sheet["A1"].font = title_font

    headers = ["Çap (mm)", "Parça Adedi", "Kesim Boyu (m)", "Çubuk Sayısı", "Stok Boyu (m)", "Fire (m)", "Fire %"]
    for col, header in enumerate(headers, start=1):
        cell = summary_sheet.cell(row=3, column=col, value=header)
        cell.fill = header_fill
        cell.font = header_font
        cell.alignment = Alignment(horizontal="center")

    summary = _diameter_summary(result)
    row = 4
    for item in summary:
        summary_sheet.cell(row=row, column=1, value=f"Ø{item['diameter']}")
        summary_sheet.cell(row=row, column=2, value=item["pieces"])
        summary_sheet.cell(row=row, column=3, value=item["cut_length_m"])
        summary_sheet.cell(row=row, column=4, value=item["bars"])
        summary_sheet.cell(row=row, column=5, value=item["stock_length_m"])
        summary_sheet.cell(row=row, column=6, value=item["waste_m"])
        summary_sheet.cell(row=row, column=7, value=item["waste_percent"])
        row += 1

    summary_sheet.cell(row=row + 1, column=1, value="TOPLAM").font = Font(bold=True)
    summary_sheet.cell(row=row + 1, column=4, value=result.get("total_bars", 0)).font = Font(bold=True)
    summary_sheet.cell(row=row + 1, column=6, value=result.get("total_waste_m", 0)).font = Font(bold=True)
    summary_sheet.cell(row=row + 1, column=7, value=result.get("waste_percent", 0)).font = Font(bold=True)

    for col in range(1, len(headers) + 1):
        summary_sheet.column_dimensions[chr(64 + col)].width = 16

    # --- Kesim planı sayfası ---
    plan_sheet = workbook.create_sheet("Kesim Planı")
    plan_headers = ["Çap (mm)", "Çubuk Adedi", "Kesimler (m) — boy ×adet (eleman no)", "Fire (m)"]
    for col, header in enumerate(plan_headers, start=1):
        cell = plan_sheet.cell(row=1, column=col, value=header)
        cell.fill = header_fill
        cell.font = header_font

    plan_row = 2
    bar_length_m = float(result.get("bar_length_m", 12.0))
    for diameter, bars in sorted(result.get("plans", {}).items(), key=lambda kv: int(kv[0])):
        for group in _group_bars(bars):
            bar = group["bar"]
            cuts = _cuts_label(bar["cuts"])
            plan_sheet.cell(row=plan_row, column=1, value=f"Ø{diameter}")
            plan_sheet.cell(row=plan_row, column=2, value=f"×{group['count']}")
            plan_sheet.cell(row=plan_row, column=3, value=f"{cuts}  (/{bar_length_m}m)")
            plan_sheet.cell(row=plan_row, column=4, value=bar["waste_m"])
            plan_row += 1

    plan_sheet.column_dimensions["A"].width = 12
    plan_sheet.column_dimensions["B"].width = 14
    plan_sheet.column_dimensions["C"].width = 70
    plan_sheet.column_dimensions["D"].width = 12

    buffer = io.BytesIO()
    workbook.save(buffer)
    buffer.seek(0)
    return buffer
