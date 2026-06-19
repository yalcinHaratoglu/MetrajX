STANDARD_BAR_LENGTH = 12.0


def optimize_cutting_stock(
    requirements: list[dict],
    bar_length: float = STANDARD_BAR_LENGTH,
) -> dict:
    """
    Google OR-Tools ile 1D Cutting Stock optimizasyonu.

    Girdi örneği:
        [{"diameter_mm": 16, "length_m": 4.0, "quantity": 50, "element_ref": "K-101"}]

    Çıktı örneği:
        {
            "16": [
                {
                    "stock_index": 1,
                    "cuts": [{"length": 4.0, "element_ref": "K-101", "position": 1}],
                    "waste_m": 8.0,
                }
            ],
            "waste_percent": 0.0,
        }
    """
    raise NotImplementedError("Phase 1 — optimizasyon motoru sonraki iterasyonda implemente edilecek.")
