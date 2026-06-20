"""Aşama 2 — Optimizasyon (1D Cutting Stock Problem).

Google OR-Tools (CP-SAT) ile, 12 metrelik (1200 cm) standart çubuklardan
minimum fire verecek kesim planını üretir. CP-SAT optimal çözümü bulamazsa
veya zaman aşımına uğrarsa First-Fit Decreasing (FFD) sezgiseli sonucu döner.

Girdi (internal format, optimizer_service tarafından üretilir):
    [{"diameter_mm": 16, "length_m": 4.0, "quantity": 50, "element_ref": "K-101"}]

Çıktı:
    {
        "bar_length_m": 12.0,
        "total_bars": 12,
        "total_waste_m": 4.0,
        "waste_percent": 2.78,
        "plans": {
            "16": [
                {"stock_index": 1, "cuts": [{"length": 4.0, "element_ref": "K-101"}], "waste_m": 0.0}
            ]
        }
    }
"""

from __future__ import annotations

from collections import defaultdict

STANDARD_BAR_LENGTH_M = 12.0
_CM = 100  # metre -> cm dönüşümü (tamsayı çözüm için)
_SOLVER_TIME_LIMIT_S = 6.0


def _ffd_pack(pieces: list[dict], capacity_cm: int) -> list[list[int]]:
    """First-Fit Decreasing — parça indekslerini kovalara (çubuk) yerleştirir."""
    order = sorted(range(len(pieces)), key=lambda i: pieces[i]["length_cm"], reverse=True)
    bins: list[list[int]] = []
    remaining: list[int] = []

    for idx in order:
        length = pieces[idx]["length_cm"]
        placed = False
        for bin_index, capacity_left in enumerate(remaining):
            if capacity_left >= length:
                bins[bin_index].append(idx)
                remaining[bin_index] -= length
                placed = True
                break
        if not placed:
            bins.append([idx])
            remaining.append(capacity_cm - length)
    return bins


def _solve_diameter(pieces: list[dict], capacity_cm: int) -> list[list[int]]:
    """Tek çap için optimal kesim. CP-SAT dener, olmazsa FFD'ye düşer."""
    ffd_bins = _ffd_pack(pieces, capacity_cm)
    if len(pieces) <= 1:
        return ffd_bins

    try:
        from ortools.sat.python import cp_model
    except ImportError:
        return ffd_bins

    max_bins = len(ffd_bins)
    if max_bins <= 1:
        return ffd_bins

    n = len(pieces)
    model = cp_model.CpModel()

    x = {(i, b): model.NewBoolVar(f"x_{i}_{b}") for i in range(n) for b in range(max_bins)}
    y = [model.NewBoolVar(f"y_{b}") for b in range(max_bins)]

    for i in range(n):
        model.Add(sum(x[(i, b)] for b in range(max_bins)) == 1)

    for b in range(max_bins):
        model.Add(
            sum(pieces[i]["length_cm"] * x[(i, b)] for i in range(n)) <= capacity_cm * y[b]
        )

    # Simetri kırma: kullanılan kovalar baştan dolu olsun
    for b in range(max_bins - 1):
        model.Add(y[b] >= y[b + 1])

    model.Minimize(sum(y))

    # FFD çözümünü başlangıç ipucu olarak ver
    for b, bucket in enumerate(ffd_bins):
        model.AddHint(y[b], 1)
        for i in bucket:
            model.AddHint(x[(i, b)], 1)

    solver = cp_model.CpSolver()
    solver.parameters.max_time_in_seconds = _SOLVER_TIME_LIMIT_S
    solver.parameters.num_search_workers = 8
    status = solver.Solve(model)

    if status not in (cp_model.OPTIMAL, cp_model.FEASIBLE):
        return ffd_bins

    bins: list[list[int]] = []
    for b in range(max_bins):
        if solver.Value(y[b]) != 1:
            continue
        bucket = [i for i in range(n) if solver.Value(x[(i, b)]) == 1]
        if bucket:
            bins.append(bucket)
    return bins or ffd_bins


def optimize_cutting_stock(
    requirements: list[dict],
    bar_length_m: float = STANDARD_BAR_LENGTH_M,
) -> dict:
    """Donatı listesini çap bazında optimize eder ve kesim planını döner."""
    capacity_cm = int(round(bar_length_m * _CM))

    by_diameter: dict[int, list[dict]] = defaultdict(list)
    for req in requirements:
        diameter = int(req["diameter_mm"])
        length_m = float(req["length_m"])
        quantity = int(req.get("quantity", 1) or 1)
        element_ref = req.get("element_ref", "") or ""
        length_cm = int(round(length_m * _CM))

        if length_cm <= 0:
            continue
        if length_cm > capacity_cm:
            raise ValueError(
                f"Ø{diameter} için {length_m} m boy, {bar_length_m} m çubuktan uzun olamaz."
            )
        for _ in range(quantity):
            by_diameter[diameter].append(
                {"length_cm": length_cm, "length_m": round(length_m, 3), "element_ref": element_ref}
            )

    plans: dict[str, list[dict]] = {}
    total_bars = 0
    total_waste_cm = 0

    for diameter in sorted(by_diameter):
        pieces = by_diameter[diameter]
        bins = _solve_diameter(pieces, capacity_cm)
        diameter_plan: list[dict] = []

        for stock_index, bucket in enumerate(bins, start=1):
            used_cm = sum(pieces[i]["length_cm"] for i in bucket)
            waste_cm = capacity_cm - used_cm
            cuts = [
                {
                    "length": pieces[i]["length_m"],
                    "element_ref": pieces[i]["element_ref"],
                    "position": position,
                }
                for position, i in enumerate(
                    sorted(bucket, key=lambda i: pieces[i]["length_cm"], reverse=True),
                    start=1,
                )
            ]
            diameter_plan.append(
                {
                    "stock_index": stock_index,
                    "cuts": cuts,
                    "waste_m": round(waste_cm / _CM, 3),
                }
            )
            total_waste_cm += waste_cm

        plans[str(diameter)] = diameter_plan
        total_bars += len(bins)

    total_capacity_cm = total_bars * capacity_cm
    waste_percent = round((total_waste_cm / total_capacity_cm) * 100, 2) if total_capacity_cm else 0.0

    return {
        "bar_length_m": round(bar_length_m, 2),
        "total_bars": total_bars,
        "total_waste_m": round(total_waste_cm / _CM, 3),
        "waste_percent": waste_percent,
        "plans": plans,
    }
