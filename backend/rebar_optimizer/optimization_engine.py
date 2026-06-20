"""Geriye dönük uyumluluk kalkanı.

Optimizasyon mantığı `services/optimizer.py` içine taşındı.
"""

from .services.optimizer import STANDARD_BAR_LENGTH_M, optimize_cutting_stock

STANDARD_BAR_LENGTH = STANDARD_BAR_LENGTH_M

__all__ = ["STANDARD_BAR_LENGTH", "STANDARD_BAR_LENGTH_M", "optimize_cutting_stock"]
