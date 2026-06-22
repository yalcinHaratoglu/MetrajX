import { LayoutGrid, Scissors, type LucideIcon } from "lucide-react";
import type { AppCatalogEntry, SiteAppInstallation } from "../services/marketplaceService";

const ICONS: Record<string, LucideIcon> = {
  scissors: Scissors,
  "layout-grid": LayoutGrid,
};

export type ResolvedApp = {
  slug: string;
  path: string;
  icon: LucideIcon;
  titleKey: string;
  descKey: string;
  installationId?: number;
};

export function resolveAppIcon(iconKey: string): LucideIcon {
  return ICONS[iconKey] ?? LayoutGrid;
}

export function appFromInstallation(installation: SiteAppInstallation): ResolvedApp {
  const { app } = installation;
  return {
    slug: app.slug,
    path: app.route_path,
    icon: resolveAppIcon(app.icon_key),
    titleKey: app.title_key,
    descKey: app.desc_key,
    installationId: installation.id,
  };
}

export function appFromCatalogEntry(entry: AppCatalogEntry): ResolvedApp {
  return {
    slug: entry.slug,
    path: entry.route_path,
    icon: resolveAppIcon(entry.icon_key),
    titleKey: entry.title_key,
    descKey: entry.desc_key,
    installationId: entry.installation_id ?? undefined,
  };
}

export function isApplicationsPath(pathname: string, installedPaths: string[]): boolean {
  if (pathname === "/applications") return true;
  return installedPaths.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );
}

/** @deprecated Statik liste kaldırıldı — API kullanın. Geriye dönük /rebar yönlendirmesi için. */
export const LEGACY_APP_PATHS = ["/rebar", "/apps/rebar"];
