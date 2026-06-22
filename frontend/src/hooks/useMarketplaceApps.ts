import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useSite } from "./useSite";
import { useSiteData } from "./useSiteData";
import {
  marketplaceService,
  type AppCatalogEntry,
  type SiteAppInstallation,
} from "../services/marketplaceService";
import { toast } from "../lib/toast";

type MarketplaceData = {
  catalog: AppCatalogEntry[];
  installations: SiteAppInstallation[];
};

const emptyMarketplace: MarketplaceData = { catalog: [], installations: [] };

export function useMarketplaceApps() {
  const { t } = useTranslation();
  const { selectedSiteId } = useSite();

  const fetcher = useCallback(async (): Promise<MarketplaceData> => {
    if (!selectedSiteId) return emptyMarketplace;
    const [cat, inst] = await Promise.all([
      marketplaceService.getCatalog(selectedSiteId),
      marketplaceService.listInstallations(selectedSiteId),
    ]);
    return { catalog: cat, installations: inst };
  }, [selectedSiteId]);

  const { data, loading, reload } = useSiteData(selectedSiteId, fetcher, emptyMarketplace);

  const install = useCallback(
    async (appSlug: string) => {
      if (!selectedSiteId) return;
      await marketplaceService.install(selectedSiteId, appSlug);
      toast.success(t("applications.installed"));
      await reload();
    },
    [selectedSiteId, reload, t],
  );

  const uninstall = useCallback(
    async (installationId: number) => {
      await marketplaceService.uninstall(installationId);
      toast.success(t("applications.uninstalled"));
      await reload();
    },
    [reload, t],
  );

  return {
    catalog: data.catalog,
    installations: data.installations,
    loading,
    refresh: reload,
    install,
    uninstall,
  };
}
