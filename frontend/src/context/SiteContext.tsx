import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { siteService, type SiteSummary } from "../services/siteService";
import { useAuth } from "../hooks/useAuth";
import { SiteContext } from "./site-context";

const STORAGE_KEY = "conmanage-selected-site";

function readStoredSiteId(): number | null {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw || raw === "all") return null;
  const id = Number(raw);
  return Number.isNaN(id) ? null : id;
}

export function SiteProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, user } = useAuth();
  const [sites, setSites] = useState<SiteSummary[]>([]);
  const [selectedSiteId, setSelectedSiteIdState] = useState<number | null>(readStoredSiteId);
  const [isLoading, setIsLoading] = useState(false);

  const setSelectedSiteId = useCallback((id: number | null) => {
    setSelectedSiteIdState(id);
    localStorage.setItem(STORAGE_KEY, id === null ? "all" : String(id));
  }, []);

  const refreshSites = useCallback(async () => {
    if (!isAuthenticated) {
      setSites([]);
      return;
    }
    setIsLoading(true);
    try {
      const data = await siteService.mine();
      setSites(data);

      const stored = readStoredSiteId();
      if (stored && !data.some((s) => s.id === stored)) {
        setSelectedSiteId(null);
      }

      if (user?.role === "site_manager" && data.length === 1) {
        setSelectedSiteId(data[0].id);
      }
    } catch {
      setSites([]);
    } finally {
      setIsLoading(false);

    }
  }, [isAuthenticated, setSelectedSiteId, user]);

  useEffect(() => {
    const load = async () => {
      await refreshSites();
    };
    void load();
  }, [refreshSites]);

  const value = useMemo(
    () => ({
      sites,
      selectedSiteId,
      setSelectedSiteId,
      isLoading,
      refreshSites,
    }),
    [sites, selectedSiteId, setSelectedSiteId, isLoading, refreshSites],
  );

  return <SiteContext.Provider value={value}>{children}</SiteContext.Provider>;
}
