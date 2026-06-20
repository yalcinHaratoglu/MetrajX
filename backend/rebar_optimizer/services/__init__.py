"""MetrajX donatı optimizasyon servis katmanı.

3 aşama:
    1. parsers   — DXF/PDF/XLSX dosyalarından donatı verisini ayıklama
    2. optimizer — OR-Tools 1D cutting stock optimizasyonu
    3. exporters — Excel/PDF raporlama
"""

from .optimizer import STANDARD_BAR_LENGTH_M, optimize_cutting_stock
from .optimizer_service import OptimizerService

__all__ = [
    "STANDARD_BAR_LENGTH_M",
    "optimize_cutting_stock",
    "OptimizerService",
]
