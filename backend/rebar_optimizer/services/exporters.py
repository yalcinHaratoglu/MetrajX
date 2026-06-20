"""Aşama 3 — Raporlama (Export Engine).

Optimizasyon sonucunu iki formatta sunar:
    - Excel (openpyxl): çap bazlı metraj, çubuk ve fire özeti + kesim planı
    - PDF (reportlab): şantiyede kullanılabilir görsel "Kesim Çizelgesi"
Ayrıca kullanıcının doldurabileceği boş XLSX şablonu üretir.
"""

from __future__ import annotations

import io


TEMPLATE_HEADERS = ["Çap (mm)", "Boy (m)", "Adet", "Eleman No"]
TEMPLATE_EXAMPLES = [
    [16, 4.5, 10, "K-101"],
    [12, 3.0, 24, "K-102"],
    [8, 2.4, 50, "D-201"],
]


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
    summary_sheet["A1"] = f"MetrajX — {project_name}"
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
    plan_headers = ["Çap (mm)", "Çubuk No", "Kesimler (m)", "Fire (m)"]
    for col, header in enumerate(plan_headers, start=1):
        cell = plan_sheet.cell(row=1, column=col, value=header)
        cell.fill = header_fill
        cell.font = header_font

    plan_row = 2
    bar_length_m = float(result.get("bar_length_m", 12.0))
    for diameter, bars in sorted(result.get("plans", {}).items(), key=lambda kv: int(kv[0])):
        for bar in bars:
            cuts = " + ".join(
                f"{cut['length']}" + (f" ({cut['element_ref']})" if cut["element_ref"] else "")
                for cut in bar["cuts"]
            )
            plan_sheet.cell(row=plan_row, column=1, value=f"Ø{diameter}")
            plan_sheet.cell(row=plan_row, column=2, value=bar["stock_index"])
            plan_sheet.cell(row=plan_row, column=3, value=f"{cuts}  (/{bar_length_m}m)")
            plan_sheet.cell(row=plan_row, column=4, value=bar["waste_m"])
            plan_row += 1

    plan_sheet.column_dimensions["A"].width = 12
    plan_sheet.column_dimensions["B"].width = 12
    plan_sheet.column_dimensions["C"].width = 60
    plan_sheet.column_dimensions["D"].width = 12

    buffer = io.BytesIO()
    workbook.save(buffer)
    buffer.seek(0)
    return buffer


def export_pdf(project_name: str, result: dict) -> io.BytesIO:
    """Şantiye için görsel kesim çizelgesi (PDF) üretir."""
    from reportlab.lib import colors
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.units import cm
    from reportlab.pdfgen import canvas

    buffer = io.BytesIO()
    pdf = canvas.Canvas(buffer, pagesize=A4)
    width, height = A4
    margin = 1.5 * cm
    bar_length_m = float(result.get("bar_length_m", 12.0))

    def header(title: str) -> float:
        pdf.setFillColor(colors.HexColor("#0F172A"))
        pdf.rect(0, height - 2.2 * cm, width, 2.2 * cm, fill=1, stroke=0)
        pdf.setFillColor(colors.white)
        pdf.setFont("Helvetica-Bold", 16)
        pdf.drawString(margin, height - 1.4 * cm, "MetrajX — Kesim Çizelgesi")
        pdf.setFont("Helvetica", 10)
        pdf.drawString(margin, height - 1.9 * cm, f"{title}  |  Çubuk: {bar_length_m} m  |  Fire: %{result.get('waste_percent', 0)}")
        return height - 3 * cm

    y = header(project_name)
    bar_px_width = width - 2 * margin
    pdf.setFillColor(colors.black)

    for diameter, bars in sorted(result.get("plans", {}).items(), key=lambda kv: int(kv[0])):
        if y < 4 * cm:
            pdf.showPage()
            y = header(project_name)

        pdf.setFont("Helvetica-Bold", 12)
        pdf.setFillColor(colors.HexColor("#0284C7"))
        pdf.drawString(margin, y, f"Ø{diameter}  ({len(bars)} çubuk)")
        pdf.setFillColor(colors.black)
        y -= 0.7 * cm

        for bar in bars:
            if y < 3 * cm:
                pdf.showPage()
                y = header(project_name)
                y -= 0.5 * cm

            pdf.setFont("Helvetica", 8)
            pdf.drawString(margin, y + 0.15 * cm, f"#{bar['stock_index']}")
            track_x = margin + 1 * cm
            track_w = bar_px_width - 1 * cm
            bar_height = 0.5 * cm

            cursor = track_x
            for cut in bar["cuts"]:
                seg_w = (cut["length"] / bar_length_m) * track_w
                pdf.setFillColor(colors.HexColor("#0284C7"))
                pdf.rect(cursor, y, seg_w, bar_height, fill=1, stroke=1)
                pdf.setFillColor(colors.white)
                if seg_w > 0.8 * cm:
                    pdf.setFont("Helvetica", 7)
                    pdf.drawCentredString(cursor + seg_w / 2, y + 0.15 * cm, f"{cut['length']}")
                cursor += seg_w

            if bar["waste_m"] > 0:
                seg_w = (bar["waste_m"] / bar_length_m) * track_w
                pdf.setFillColor(colors.HexColor("#CBD5E1"))
                pdf.rect(cursor, y, seg_w, bar_height, fill=1, stroke=1)

            pdf.setFillColor(colors.black)
            pdf.setFont("Helvetica", 7)
            pdf.drawString(track_x + track_w + 0.1 * cm, y + 0.15 * cm, f"fire {bar['waste_m']}m")
            y -= 0.75 * cm

        y -= 0.4 * cm

    pdf.showPage()
    pdf.save()
    buffer.seek(0)
    return buffer
