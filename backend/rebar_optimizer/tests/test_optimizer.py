from django.test import TestCase

from rebar_optimizer.services.optimizer import optimize_cutting_stock


class OptimizerTests(TestCase):
    def test_single_bar_fits_two_pieces(self):
        result = optimize_cutting_stock(
            [
                {"diameter_mm": 16, "length_m": 6.0, "quantity": 1, "element_ref": "A"},
                {"diameter_mm": 16, "length_m": 6.0, "quantity": 1, "element_ref": "B"},
            ]
        )
        self.assertEqual(result["total_bars"], 1)
        self.assertEqual(result["waste_percent"], 0.0)
        self.assertEqual(len(result["plans"]["16"]), 1)
        self.assertEqual(len(result["plans"]["16"][0]["cuts"]), 2)

    def test_separates_by_diameter(self):
        result = optimize_cutting_stock(
            [
                {"diameter_mm": 16, "length_m": 4.0, "quantity": 1, "element_ref": ""},
                {"diameter_mm": 12, "length_m": 4.0, "quantity": 1, "element_ref": ""},
            ]
        )
        self.assertIn("16", result["plans"])
        self.assertIn("12", result["plans"])
        self.assertEqual(result["total_bars"], 2)

    def test_waste_calculation(self):
        result = optimize_cutting_stock(
            [{"diameter_mm": 20, "length_m": 5.0, "quantity": 1, "element_ref": ""}]
        )
        self.assertEqual(result["total_bars"], 1)
        self.assertAlmostEqual(result["total_waste_m"], 7.0, places=2)

    def test_rejects_oversized_piece(self):
        with self.assertRaises(ValueError):
            optimize_cutting_stock(
                [{"diameter_mm": 16, "length_m": 15.0, "quantity": 1, "element_ref": ""}]
            )

    def test_minimizes_bar_count(self):
        result = optimize_cutting_stock(
            [{"diameter_mm": 16, "length_m": 4.0, "quantity": 6, "element_ref": ""}]
        )
        # 6 x 4m = 24m -> en az 2 çubuk (her çubuğa 3 parça)
        self.assertEqual(result["total_bars"], 2)
