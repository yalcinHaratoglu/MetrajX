import api from "./api";

export interface Vendor {
  id: number;
  name: string;
  tax_number: string;
  contact_phone: string;
  notes: string;
  is_active: boolean;
  subcontractor: number | null;
  subcontractor_name: string | null;
  created_at: string;
}

export interface LedgerEntry {
  id: number;
  site: number;
  account: number;
  account_code: string;
  account_name: string;
  vendor: number | null;
  vendor_name: string | null;
  direction: "debit" | "credit";
  amount: string;
  entry_date: string;
  description: string;
  source_type: string;
  hakedis_period_id: number | null;
  created_at: string;
}

export interface LedgerSummary {
  total_credit: string;
  total_debit: string;
  balance: string;
  entry_count: number;
  budget_total?: string | null;
  budget_spent?: string;
  budget_remaining?: string | null;
}

export interface MaterialStockItem {
  id: number;
  site: number;
  name: string;
  unit: string;
  quantity_on_hand: string;
  reorder_level: string | null;
  is_low: boolean;
  notes: string;
  created_at: string;
}

export interface MaterialMovement {
  id: number;
  item: number;
  item_name: string;
  movement_type: "in" | "out";
  quantity: string;
  movement_date: string;
  notes: string;
  created_at: string;
}

export const finansService = {
  async listVendors() {
    const { data } = await api.get<Vendor[]>("/finans/vendors/");
    return data;
  },

  async listLedger(siteId: number, vendorId?: number) {
    const { data } = await api.get<LedgerEntry[]>("/finans/ledger/", {
      params: { site_id: siteId, ...(vendorId ? { vendor_id: vendorId } : {}) },
    });
    return data;
  },

  async summary(siteId: number) {
    const { data } = await api.get<LedgerSummary>("/finans/summary/", {
      params: { site_id: siteId },
    });
    return data;
  },

  async recordPayment(payload: {
    site_id: number;
    amount: string | number;
    vendor_id?: number | null;
    description?: string;
    entry_date?: string;
  }) {
    const { data } = await api.post<LedgerEntry>("/finans/payments/", payload);
    return data;
  },

  async listStock(siteId: number) {
    const { data } = await api.get<MaterialStockItem[]>("/finans/stock/", {
      params: { site_id: siteId },
    });
    return data;
  },

  async createStock(payload: {
    site_id: number;
    name: string;
    unit?: string;
    reorder_level?: string | null;
    quantity_on_hand?: string | number;
    notes?: string;
  }) {
    const { data } = await api.post<MaterialStockItem>("/finans/stock/", payload);
    return data;
  },

  async recordMovement(payload: {
    item: number;
    movement_type: "in" | "out";
    quantity: string | number;
    movement_date: string;
    notes?: string;
  }) {
    const { data } = await api.post<MaterialMovement>("/finans/stock/movements/", payload);
    return data;
  },

  async listMovements(siteId: number) {
    const { data } = await api.get<MaterialMovement[]>("/finans/stock/movements/", {
      params: { site_id: siteId },
    });
    return data;
  },
};
