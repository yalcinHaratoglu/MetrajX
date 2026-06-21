import { useSite } from "../hooks/useSite";
import { ProjectDetailPage } from "./ProjectDetailPage";
import { PageHeader } from "../components/layout/PageHeader";
import { EmptyState } from "../components/ui/EmptyState";
import { Scissors } from "lucide-react";
import { useTranslation } from "react-i18next";

/** Demir optimizasyonu — bağımsız uygulama modülü */
export function RebarPage() {
  const { t } = useTranslation();
  const { selectedSiteId } = useSite();

  if (!selectedSiteId) {
    return (
      <div className="page-stack">
        <PageHeader title={t("rebar.title")} subtitle={t("rebar.subtitle")} />
        <EmptyState
          icon={<Scissors size={28} />}
          title={t("rebar.selectSiteTitle")}
          description={t("rebar.selectSiteDesc")}
        />
      </div>
    );
  }

  return <ProjectDetailPage embeddedSiteId={selectedSiteId} />;
}
