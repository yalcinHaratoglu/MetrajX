"""Orkestrasyon — parse -> kayıt -> optimize -> sonuç/rapor.

Tipik akış:
    OptimizerService.import_from_file(project, django_file)
    result = OptimizerService.run_optimization(project)
    excel = OptimizerService.export_excel(project)
"""

from __future__ import annotations

import io
from collections import defaultdict
from decimal import Decimal

from django.db import transaction

from ..models import CuttingPlan, OptimizationRun, Project, RebarRequirement
from . import exporters, parsers
from .optimizer import STANDARD_BAR_LENGTH_M, optimize_cutting_stock


class OptimizerService:
    """Donatı verisi içe aktarma, optimizasyon ve raporlama orkestrasyonu."""

    # ---- Aşama 1: İçe aktarma ----

    @staticmethod
    def _persist_rows(project: Project, rows: list[dict]) -> list[RebarRequirement]:
        created: list[RebarRequirement] = []
        for row in rows:
            created.append(
                RebarRequirement(
                    project=project,
                    diameter_mm=int(row["rebar_diameter"]),
                    length_m=Decimal(str(row["total_length"])),
                    quantity=int(row.get("quantity", 1) or 1),
                    element_ref=str(row.get("element_ref", "") or "")[:64],
                )
            )
        if created:
            RebarRequirement.objects.bulk_create(created)
        return created

    @classmethod
    @transaction.atomic
    def import_from_file(cls, project: Project, file, filename: str) -> list[dict]:
        """XLSX şablonundan donatı ayıklar ve mevcut veriyi DEĞİŞTİRİR.

        Dosya importu append değil replace mantığıyla çalışır: yeni satır
        bulunursa projenin tüm mevcut donatı kalemleri silinip yenisi yazılır.
        Hiç satır bulunamazsa mevcut veriye dokunulmaz.
        """
        rows = parsers.parse_file(file, filename)
        if rows:
            project.requirements.all().delete()
            cls._persist_rows(project, rows)
        return rows

    @classmethod
    @transaction.atomic
    def import_rows(cls, project: Project, rows: list[dict]) -> list[dict]:
        """Önceden parse edilmiş satırları kaydeder (manuel/önizleme akışı)."""
        cls._persist_rows(project, rows)
        return rows

    # ---- Aşama 2: Optimizasyon ----

    @classmethod
    @transaction.atomic
    def run_optimization(
        cls,
        project: Project,
        bar_length_m: float = STANDARD_BAR_LENGTH_M,
    ) -> dict:
        requirements = list(
            project.requirements.values("diameter_mm", "length_m", "quantity", "element_ref")
        )
        if not requirements:
            raise ValueError("Optimizasyon için donatı kalemi bulunamadı.")

        normalized = [
            {
                "diameter_mm": int(req["diameter_mm"]),
                "length_m": float(req["length_m"]),
                "quantity": int(req["quantity"]),
                "element_ref": req["element_ref"],
            }
            for req in requirements
        ]

        result = optimize_cutting_stock(normalized, bar_length_m=bar_length_m)

        run = OptimizationRun.objects.create(
            project=project,
            bar_length_m=Decimal(str(result["bar_length_m"])),
            waste_percent=Decimal(str(result["waste_percent"])),
        )

        plans_to_create: list[CuttingPlan] = []
        for diameter, bars in result["plans"].items():
            for bar in bars:
                plans_to_create.append(
                    CuttingPlan(
                        run=run,
                        diameter_mm=int(diameter),
                        stock_bar_index=bar["stock_index"],
                        cuts=bar["cuts"],
                        waste_m=Decimal(str(bar["waste_m"])),
                    )
                )
        if plans_to_create:
            CuttingPlan.objects.bulk_create(plans_to_create)

        project.status = Project.Status.READY
        project.save(update_fields=["status", "updated_at"])

        result["run_id"] = run.id
        return result

    # ---- Sonuç ----

    @staticmethod
    def latest_run(project: Project) -> OptimizationRun | None:
        return project.optimization_runs.prefetch_related("cutting_plans").first()

    @classmethod
    def build_result(cls, project: Project) -> dict | None:
        run = cls.latest_run(project)
        if not run:
            return None

        bar_length_m = float(run.bar_length_m)
        plans: dict[str, list[dict]] = defaultdict(list)
        total_bars = 0
        total_waste_m = 0.0

        for plan in run.cutting_plans.all():
            plans[str(plan.diameter_mm)].append(
                {
                    "stock_index": plan.stock_bar_index,
                    "cuts": plan.cuts,
                    "waste_m": float(plan.waste_m),
                }
            )
            total_bars += 1
            total_waste_m += float(plan.waste_m)

        return {
            "run_id": run.id,
            "bar_length_m": bar_length_m,
            "total_bars": total_bars,
            "total_waste_m": round(total_waste_m, 3),
            "waste_percent": float(run.waste_percent or 0),
            "plans": dict(plans),
            "created_at": run.created_at.isoformat(),
        }

    # ---- Aşama 3: Raporlama ----

    @classmethod
    def export_excel(cls, project: Project) -> io.BytesIO:
        result = cls.build_result(project)
        if not result:
            raise ValueError("Önce optimizasyon çalıştırın.")
        return exporters.export_excel(project.name, result)

    @staticmethod
    def build_template() -> io.BytesIO:
        return exporters.build_template()
