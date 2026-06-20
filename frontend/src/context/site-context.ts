import { createContext } from "react";
import type { SiteSummary } from "../services/siteService";

export interface SiteContextValue {
  sites: SiteSummary[];
  selectedSiteId: number | null;
  setSelectedSiteId: (id: number | null) => void;
  isLoading: boolean;
  refreshSites: () => Promise<void>;
}

export const SiteContext = createContext<SiteContextValue | null>(null);
