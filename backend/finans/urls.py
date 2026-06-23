from django.urls import path

from .views import (
    LedgerEntryListView,
    LedgerSummaryView,
    MaterialMovementListCreateView,
    MaterialStockListCreateView,
    PaymentCreateView,
    VendorBalanceListView,
    VendorListCreateView,
)

urlpatterns = [
    path("finans/vendors/", VendorListCreateView.as_view(), name="finans-vendors"),
    path("finans/vendor-balances/", VendorBalanceListView.as_view(), name="finans-vendor-balances"),
    path("finans/ledger/", LedgerEntryListView.as_view(), name="finans-ledger"),
    path("finans/summary/", LedgerSummaryView.as_view(), name="finans-summary"),
    path("finans/payments/", PaymentCreateView.as_view(), name="finans-payments"),
    path("finans/stock/", MaterialStockListCreateView.as_view(), name="finans-stock"),
    path("finans/stock/movements/", MaterialMovementListCreateView.as_view(), name="finans-stock-movements"),
]
