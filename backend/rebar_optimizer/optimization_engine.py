STANDARD_BAR_LENGTH = 12.0


def _pack_diameter(pieces: list[dict], bar_length: float) -> list[dict]:
    """First-fit decreasing ile tek çap için kesim planı."""
    sorted_pieces = sorted(pieces, key=lambda item: item["length"], reverse=True)
    bars: list[dict] = []

    for piece in sorted_pieces:
        placed = False
        for bar in bars:
            if bar["remaining_m"] >= piece["length"]:
                bar["cuts"].append(
                    {
                        "length": piece["length"],
                        "element_ref": piece["element_ref"],
                        "position": len(bar["cuts"]) + 1,
                    }
                )
                bar["remaining_m"] -= piece["length"]
                placed = True
                break

        if not placed:
            bars.append(
                {
                    "stock_index": len(bars) + 1,
                    "cuts": [
                        {
                            "length": piece["length"],
                            "element_ref": piece["element_ref"],
                            "position": 1,
                        }
                    ],
                    "remaining_m": bar_length - piece["length"],
                }
            )

    for bar in bars:
        bar["waste_m"] = round(bar.pop("remaining_m"), 4)

    return bars


def optimize_cutting_stock(
    requirements: list[dict],
    bar_length: float = STANDARD_BAR_LENGTH,
) -> dict:
    """
    1D Cutting Stock optimizasyonu (çap bazlı FFD).

    Girdi örneği:
        [{"diameter_mm": 16, "length_m": 4.0, "quantity": 50, "element_ref": "K-101"}]
    """
    from collections import defaultdict

    by_diameter: dict[int, list[dict]] = defaultdict(list)

    for requirement in requirements:
        diameter = int(requirement["diameter_mm"])
        length = float(requirement["length_m"])
        quantity = int(requirement.get("quantity", 1))
        element_ref = requirement.get("element_ref", "")

        for _ in range(quantity):
            by_diameter[diameter].append({"length": length, "element_ref": element_ref})

    plans: dict[str, list[dict]] = {}
    total_bar_length = 0.0
    total_waste = 0.0

    for diameter, pieces in by_diameter.items():
        bars = _pack_diameter(pieces, bar_length)
        plans[str(diameter)] = bars
        total_bar_length += len(bars) * bar_length
        total_waste += sum(bar["waste_m"] for bar in bars)

    waste_percent = round((total_waste / total_bar_length) * 100, 2) if total_bar_length else 0.0

    return {
        **plans,
        "waste_percent": waste_percent,
        "bar_length_m": bar_length,
        "total_bars": sum(len(bars) for bars in plans.values()),
    }
