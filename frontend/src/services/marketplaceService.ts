import api from "./api";

export interface AppCatalogEntry {
  id: number;
  slug: string;
  title_key: string;
  desc_key: string;
  icon_key: string;
  route_path: string;
  sort_order: number;
  is_installable: boolean;
  is_installed: boolean;
  installation_id: number | null;
}

export interface AppDefinition {
  id: number;
  slug: string;
  title_key: string;
  desc_key: string;
  icon_key: string;
  route_path: string;
  sort_order: number;
  is_active: boolean;
}

export interface SiteAppInstallation {
  id: number;
  site: number;
  app: AppDefinition;
  installed_at: string;
}

export const marketplaceService = {
  async getCatalog(siteId: number) {
    const { data } = await api.get<AppCatalogEntry[]>("/marketplace/catalog/", {
      params: { site_id: siteId },
    });
    return data;
  },

  async listInstallations(siteId: number) {
    const { data } = await api.get<SiteAppInstallation[]>("/marketplace/installations/", {
      params: { site_id: siteId },
    });
    return data;
  },

  async install(siteId: number, appSlug: string) {
    const { data } = await api.post<SiteAppInstallation>("/marketplace/installations/create/", {
      site_id: siteId,
      app_slug: appSlug,
    });
    return data;
  },

  async uninstall(installationId: number) {
    await api.delete(`/marketplace/installations/${installationId}/`);
  },
};
