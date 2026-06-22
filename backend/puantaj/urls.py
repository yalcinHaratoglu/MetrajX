from django.urls import path

from .views import (
    AdvancePaymentDetailView,
    AdvancePaymentListCreateView,
    HakedisPeriodApproveView,
    HakedisPeriodCalculateView,
    HakedisPeriodDeductionDetailView,
    HakedisPeriodDetailView,
    HakedisPeriodListCreateView,
    HakedisPeriodSubmitView,
    HakedisSiteView,
    HakedisSubcontractorView,
    SettlementView,
    SubcontractorContractDetailView,
    SubcontractorContractListCreateView,
    SubcontractorDetailView,
    SubcontractorListCreateView,
    TimesheetApproveView,
    TimesheetDetailView,
    TimesheetListCreateView,
    WorkerDetailView,
    WorkerListCreateView,
)

from .views_attendance import AttendanceMatrixView, AttendanceToggleView

urlpatterns = [
    path("puantaj/subcontractors/", SubcontractorListCreateView.as_view(), name="puantaj-subcontractors"),
    path(
        "puantaj/subcontractors/<int:pk>/",
        SubcontractorDetailView.as_view(),
        name="puantaj-subcontractor-detail",
    ),
    path("puantaj/workers/", WorkerListCreateView.as_view(), name="puantaj-workers"),
    path(
        "puantaj/workers/<int:pk>/",
        WorkerDetailView.as_view(),
        name="puantaj-worker-detail",
    ),
    path(
        "puantaj/subcontractors/<int:pk>/hakedis/",
        HakedisSubcontractorView.as_view(),
        name="puantaj-subcontractor-hakedis",
    ),
    path("puantaj/contracts/", SubcontractorContractListCreateView.as_view(), name="puantaj-contracts"),
    path(
        "puantaj/contracts/<int:pk>/",
        SubcontractorContractDetailView.as_view(),
        name="puantaj-contract-detail",
    ),
    path("puantaj/advances/", AdvancePaymentListCreateView.as_view(), name="puantaj-advances"),
    path(
        "puantaj/advances/<int:pk>/",
        AdvancePaymentDetailView.as_view(),
        name="puantaj-advance-detail",
    ),
    path(
        "puantaj/hakedis-periods/",
        HakedisPeriodListCreateView.as_view(),
        name="puantaj-hakedis-periods",
    ),
    path(
        "puantaj/hakedis-periods/<int:pk>/",
        HakedisPeriodDetailView.as_view(),
        name="puantaj-hakedis-period-detail",
    ),
    path(
        "puantaj/hakedis-periods/<int:pk>/calculate/",
        HakedisPeriodCalculateView.as_view(),
        name="puantaj-hakedis-period-calculate",
    ),
    path(
        "puantaj/hakedis-periods/<int:pk>/submit/",
        HakedisPeriodSubmitView.as_view(),
        name="puantaj-hakedis-period-submit",
    ),
    path(
        "puantaj/hakedis-periods/<int:pk>/approve/",
        HakedisPeriodApproveView.as_view(),
        name="puantaj-hakedis-period-approve",
    ),
    path(
        "puantaj/hakedis-period-deductions/<int:pk>/",
        HakedisPeriodDeductionDetailView.as_view(),
        name="puantaj-hakedis-deduction-detail",
    ),
    path("puantaj/timesheets/", TimesheetListCreateView.as_view(), name="puantaj-timesheets"),
    path(
        "puantaj/timesheets/<int:pk>/",
        TimesheetDetailView.as_view(),
        name="puantaj-timesheet-detail",
    ),
    path(
        "puantaj/timesheets/<int:pk>/approve/",
        TimesheetApproveView.as_view(),
        name="puantaj-timesheet-approve",
    ),
    path("puantaj/settlement/", SettlementView.as_view(), name="puantaj-settlement"),
    path("puantaj/hakedis/", HakedisSiteView.as_view(), name="puantaj-hakedis"),
    path("puantaj/attendance-matrix/", AttendanceMatrixView.as_view(), name="puantaj-attendance-matrix"),
    path("puantaj/attendance-toggle/", AttendanceToggleView.as_view(), name="puantaj-attendance-toggle"),
]
