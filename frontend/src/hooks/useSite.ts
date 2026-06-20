import { useContext } from "react";
import { SiteContext } from "../context/site-context";

export function useSite() {
  const context = useContext(SiteContext);
  if (!context) {
    throw new Error("useSite must be used within SiteProvider");
  }
  return context;
}

/** Seçili şantiye filtresine göre listeyi daraltır. */
export function useFilteredSites<T extends { id: number }>(items: T[]): T[] {
  const { selectedSiteId } = useSite();
  if (selectedSiteId === null) return items;
  return items.filter((item) => item.id === selectedSiteId);
}
