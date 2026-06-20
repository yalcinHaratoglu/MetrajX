import io

from django.test import TestCase

from rebar_optimizer.services import exporters, parsers


def _sample_result() -> dict:
    return {
        "bar_length_m": 12.0,
        "total_bars": 2,
        "total_waste_m": 4.0,
        "waste_percent": 16.67,
        "plans": {
            "16": [
                {
                    "stock_index": 1,
                    "cuts": [
                        {"length": 6.0, "element_ref": "K-101", "position": 1},
                        {"length": 4.0, "element_ref": "K-102", "position": 2},
                    ],
                    "waste_m": 2.0,
                },
                {
                    "stock_index": 2,
                    "cuts": [{"length": 10.0, "element_ref": "K-103", "position": 1}],
                    "waste_m": 2.0,
                },
            ]
        },
    }


class ParserTests(TestCase):
    def test_parse_xlsx_roundtrip(self):
        from openpyxl import Workbook

        workbook = Workbook()
        sheet = workbook.active
        sheet.append(["Çap (mm)", "Boy (m)", "Adet", "Eleman No"])
        sheet.append([16, 4.5, 10, "K-101"])
        sheet.append([12, 3.0, 24, "K-102"])
        buffer = io.BytesIO()
        workbook.save(buffer)
        buffer.seek(0)

        rows = parsers.parse_xlsx(buffer)
        self.assertEqual(len(rows), 2)
        first = next(r for r in rows if r["rebar_diameter"] == 16)
        self.assertEqual(first["total_length"], 4.5)
        self.assertEqual(first["quantity"], 10)
        self.assertEqual(first["element_ref"], "K-101")

    def test_unsupported_extension(self):
        with self.assertRaises(ValueError):
            parsers.parse_file(io.BytesIO(b""), "drawing.dxf")
        with self.assertRaises(ValueError):
            parsers.parse_file(io.BytesIO(b""), "drawing.pdf")


class ExporterTests(TestCase):
    def test_build_template_produces_xlsx(self):
        buffer = exporters.build_template()
        data = buffer.getvalue()
        self.assertGreater(len(data), 0)
        self.assertEqual(data[:2], b"PK")  # xlsx = zip

    def test_export_excel(self):
        buffer = exporters.export_excel("Test", _sample_result())
        data = buffer.getvalue()
        self.assertGreater(len(data), 0)
        self.assertEqual(data[:2], b"PK")
