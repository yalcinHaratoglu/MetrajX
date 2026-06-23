import api from "./api";

export type TimesheetStatus = "pending" | "approved" | "disputed";
export type HakedisPeriodStatus = "draft" | "pending_approval" | "approved" | "paid";
export type ContractStatus = "draft" | "active" | "closed";
export type InsuranceStatus = "insured" | "uninsured" | "pending";
export type EmploymentType = "subcontractor" | "direct";
export type WorkerRole = "construction_worker" | "security_guard" | "foreman" | "other";
export type PayType = "daily" | "monthly";

export interface Worker {
  id: number;
  site: number | null;
  subcontractor: number | null;
  subcontractor_name: string;
  employer_name: string;
  employment_type: EmploymentType;
  role: WorkerRole;
  pay_type: PayType;
  first_name: string;
  last_name: string;
  full_name: string;
  national_id: string;
  insurance_status: InsuranceStatus;
  phone: string;
  is_active: boolean;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface Subcontractor {
  id: number;
  site: number;
  name: string;
  category: number;
  category_name: string;
  contact_phone: string;
  notes: string;
  is_active: boolean;
  timesheet_count: number;
  metraj_item_count: number;
  earned_total: string;
  contract_total: string;
  created_at: string;
  updated_at: string;
}

export interface SubcontractorContract {
  id: number;
  subcontractor: number;
  subcontractor_name: string;
  contract_no: string;
  total_amount: string;
  scope: string;
  retainage_percent: string;
  status: ContractStatus;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface AdvancePayment {
  id: number;
  subcontractor: number;
  subcontractor_name: string;
  site: number;
  amount: string;
  payment_date: string;
  remaining_balance: string;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface HakedisPeriodLine {
  id: number;
  metraj_item: number;
  description: string;
  category_name: string;
  subcontractor: number;
  subcontractor_name: string;
  quantity: string;
  unit_price: string | null;
  prev_cumulative_percent: number;
  current_cumulative_percent: number;
  delta_percent: number;
  line_gross: string;
}

export interface HakedisPeriodDeduction {
  id: number;
  subcontractor: number;
  subcontractor_name: string;
  retainage_amount: string;
  advance_deduction: string;
  other_deductions: string;
  notes: string;
}

export interface HakedisPeriod {
  id: number;
  site: number;
  period_start: string;
  period_end: string;
  status: HakedisPeriodStatus;
  prepared_by: number | null;
  prepared_by_name: string;
  submitted_at: string | null;
  approved_by: number | null;
  approved_by_name: string;
  approved_at: string | null;
  locked_at: string | null;
  total_gross: string;
  total_retainage: string;
  total_advance_deduction: string;
  total_other_deductions: string;
  net_payable: string;
  approved_payable: string | null;
  notes: string;
  lines: HakedisPeriodLine[];
  subcontractor_deductions: HakedisPeriodDeduction[];
  created_at: string;
  updated_at: string;
}

export interface AttendanceMatrixRow {
  id: number;
  full_name: string;
  employment_type: EmploymentType;
  role: WorkerRole;
  pay_type: PayType;
  subcontractor_id: number | null;
  subcontractor_name: string;
  days: Record<string, boolean>;
  total_days: number;
}

export interface AttendanceMatrixData {
  date_from: string;
  date_to: string;
  dates: string[];
  workers: AttendanceMatrixRow[];
}

export interface Timesheet {
  id: number;
  site: number;
  subcontractor: number;
  subcontractor_name: string;
  worker: number | null;
  worker_name: string;
  date: string;
  worker_count: number;
  status: TimesheetStatus;
  approved_by: number | null;
  approved_by_name: string;
  approved_at: string | null;
  notes: string;
  created_by_name: string;
  created_at: string;
  updated_at: string;
}

export interface SettlementLine {
  subcontractor_id: number;
  subcontractor_name: string;
  category_id: number;
  category_name: string;
  item_count: number;
  contract_total: string;
  earned_total: string;
  average_progress: number;
  month_worker_days: number;
}

export interface Settlement {
  year: number;
  month: number;
  entry_count: number;
  worker_days: number;
  grand_total: string;
  contract_total: string;
  lines: SettlementLine[];
}

export interface HakedisSiteSummary {
  site_id: number;
  subcontractor_count: number;
  item_count: number;
  contract_total: string;
  earned_total: string;
  is_estimate?: boolean;
  lines: Omit<SettlementLine, "month_worker_days">[];
}

export type SubcontractorInput = {
  site_id: number;
  name: string;
  category: number;
  contact_phone?: string;
  notes?: string;
  is_active?: boolean;
};

export type TimesheetInput = {
  site_id: number;
  subcontractor: number;
  worker?: number;
  date: string;
  worker_count?: number;
  notes?: string;
};

export type WorkerInput = {
  site_id: number;
  employment_type?: EmploymentType;
  role?: WorkerRole;
  pay_type?: PayType;
  subcontractor?: number;
  first_name: string;
  last_name: string;
  national_id?: string;
  insurance_status?: InsuranceStatus;
  phone?: string;
  notes?: string;
  is_active?: boolean;
};

export const puantajService = {
  async listSubcontractors(siteId: number): Promise<Subcontractor[]> {
    const { data } = await api.get<Subcontractor[]>("/puantaj/subcontractors/", {
      params: { site_id: siteId },
    });
    return data;
  },

  async createSubcontractor(payload: SubcontractorInput): Promise<Subcontractor> {
    const { data } = await api.post<Subcontractor>("/puantaj/subcontractors/", payload);
    return data;
  },

  async updateSubcontractor(id: number, payload: Partial<SubcontractorInput>): Promise<Subcontractor> {
    const { data } = await api.patch<Subcontractor>(`/puantaj/subcontractors/${id}/`, payload);
    return data;
  },

  async deleteSubcontractor(id: number): Promise<void> {
    await api.delete(`/puantaj/subcontractors/${id}/`);
  },

  async listWorkers(siteId: number, params?: { subcontractorId?: number; employmentType?: EmploymentType }): Promise<Worker[]> {
    const { data } = await api.get<Worker[]>("/puantaj/workers/", {
      params: {
        site_id: siteId,
        subcontractor_id: params?.subcontractorId,
        employment_type: params?.employmentType,
      },
    });
    return data;
  },

  async createWorker(payload: WorkerInput): Promise<Worker> {
    const { data } = await api.post<Worker>("/puantaj/workers/", payload);
    return data;
  },

  async updateWorker(id: number, payload: Partial<WorkerInput>): Promise<Worker> {
    const { data } = await api.patch<Worker>(`/puantaj/workers/${id}/`, payload);
    return data;
  },

  async deleteWorker(id: number): Promise<void> {
    await api.delete(`/puantaj/workers/${id}/`);
  },

  async listContracts(siteId: number, subcontractorId?: number): Promise<SubcontractorContract[]> {
    const { data } = await api.get<SubcontractorContract[]>("/puantaj/contracts/", {
      params: { site_id: siteId, subcontractor_id: subcontractorId },
    });
    return data;
  },

  async createContract(payload: {
    site_id: number;
    subcontractor: number;
    contract_no?: string;
    total_amount?: string;
    scope?: string;
    retainage_percent?: string;
    status?: ContractStatus;
    start_date?: string | null;
    end_date?: string | null;
  }): Promise<SubcontractorContract> {
    const { data } = await api.post<SubcontractorContract>("/puantaj/contracts/", payload);
    return data;
  },

  async listAdvances(siteId: number): Promise<AdvancePayment[]> {
    const { data } = await api.get<AdvancePayment[]>("/puantaj/advances/", {
      params: { site_id: siteId },
    });
    return data;
  },

  async createAdvance(payload: {
    site_id: number;
    subcontractor: number;
    amount: string;
    payment_date: string;
    notes?: string;
  }): Promise<AdvancePayment> {
    const { data } = await api.post<AdvancePayment>("/puantaj/advances/", payload);
    return data;
  },

  async listHakedisPeriods(siteId: number, year?: number, month?: number): Promise<HakedisPeriod[]> {
    const { data } = await api.get<HakedisPeriod[]>("/puantaj/hakedis-periods/", {
      params: { site_id: siteId, year, month },
    });
    return data;
  },

  async getHakedisPeriod(id: number): Promise<HakedisPeriod> {
    const { data } = await api.get<HakedisPeriod>(`/puantaj/hakedis-periods/${id}/`);
    return data;
  },

  async createHakedisPeriod(payload: {
    site_id: number;
    period_start: string;
    period_end: string;
    notes?: string;
  }): Promise<HakedisPeriod> {
    const { data } = await api.post<HakedisPeriod>("/puantaj/hakedis-periods/", payload);
    return data;
  },

  async calculateHakedisPeriod(id: number): Promise<HakedisPeriod> {
    const { data } = await api.post<HakedisPeriod>(`/puantaj/hakedis-periods/${id}/calculate/`);
    return data;
  },

  async submitHakedisPeriod(id: number): Promise<HakedisPeriod> {
    const { data } = await api.post<HakedisPeriod>(`/puantaj/hakedis-periods/${id}/submit/`);
    return data;
  },

  async approveHakedisPeriod(id: number): Promise<HakedisPeriod> {
    const { data } = await api.post<HakedisPeriod>(`/puantaj/hakedis-periods/${id}/approve/`);
    return data;
  },

  async updateHakedisPeriod(
    id: number,
    payload: { notes?: string; approved_payable?: string | null },
  ): Promise<HakedisPeriod> {
    const { data } = await api.patch<HakedisPeriod>(`/puantaj/hakedis-periods/${id}/`, payload);
    return data;
  },

  async deleteHakedisPeriod(id: number): Promise<void> {
    await api.delete(`/puantaj/hakedis-periods/${id}/`);
  },

  async getAttendanceMatrix(params: {
    site_id: number;
    date_from: string;
    date_to: string;
    subcontractor_id?: number;
    employment_type?: EmploymentType;
    search?: string;
  }): Promise<AttendanceMatrixData> {
    const { data } = await api.get<AttendanceMatrixData>("/puantaj/attendance-matrix/", { params });
    return data;
  },

  async toggleAttendance(payload: {
    site_id: number;
    worker_id: number;
    date: string;
    present: boolean;
  }): Promise<void> {
    await api.post("/puantaj/attendance-toggle/", payload);
  },

  async exportAttendanceXlsx(params: {
    site_id: number;
    date_from: string;
    date_to: string;
    subcontractor_id?: number;
    employment_type?: EmploymentType;
    search?: string;
  }): Promise<void> {
    const response = await api.get("/puantaj/attendance-matrix/", {
      params: { ...params, export: "xlsx" },
      responseType: "blob",
    });
    const url = URL.createObjectURL(response.data);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `puantaj_${params.date_from}_${params.date_to}.xlsx`;
    anchor.click();
    URL.revokeObjectURL(url);
  },

  async updateDeduction(
    id: number,
    payload: { other_deductions?: string; notes?: string },
  ): Promise<HakedisPeriodDeduction> {
    const { data } = await api.patch<HakedisPeriodDeduction>(
      `/puantaj/hakedis-period-deductions/${id}/`,
      payload,
    );
    return data;
  },

  async listTimesheets(siteId: number, year: number, month: number): Promise<Timesheet[]> {
    const { data } = await api.get<Timesheet[]>("/puantaj/timesheets/", {
      params: { site_id: siteId, year, month },
    });
    return data;
  },

  async createTimesheet(payload: TimesheetInput): Promise<Timesheet> {
    const { data } = await api.post<Timesheet>("/puantaj/timesheets/", payload);
    return data;
  },

  async updateTimesheet(id: number, payload: Partial<TimesheetInput>): Promise<Timesheet> {
    const { data } = await api.patch<Timesheet>(`/puantaj/timesheets/${id}/`, payload);
    return data;
  },

  async approveTimesheet(id: number): Promise<Timesheet> {
    const { data } = await api.post<Timesheet>(`/puantaj/timesheets/${id}/approve/`);
    return data;
  },

  async deleteTimesheet(id: number): Promise<void> {
    await api.delete(`/puantaj/timesheets/${id}/`);
  },

  async getSettlement(siteId: number, year: number, month: number): Promise<Settlement> {
    const { data } = await api.get<Settlement>("/puantaj/settlement/", {
      params: { site_id: siteId, year, month },
    });
    return data;
  },

  async getHakedisEstimate(siteId: number): Promise<HakedisSiteSummary> {
    const { data } = await api.get<HakedisSiteSummary>("/puantaj/hakedis/", {
      params: { site_id: siteId },
    });
    return data;
  },
};
