from django.test import TestCase


class LibraryImportTests(TestCase):
    def test_ezdxf_import(self):
        import ezdxf

        self.assertTrue(hasattr(ezdxf, "readfile"))

    def test_ortools_import(self):
        from ortools.linear_solver import pywraplp

        solver = pywraplp.Solver.CreateSolver("GLOP")
        self.assertIsNotNone(solver)
