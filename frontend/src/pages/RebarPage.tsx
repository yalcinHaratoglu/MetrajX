import { Link } from "react-router-dom";
import { useSite } from "../hooks/useSite";
import { useMarketplaceApps } from "../hooks/useMarketplaceApps";
import { ProjectDetailPage } from "./ProjectDetailPage";
import { PageHeader } from "../components/layout/PageHeader";
import { EmptyState } from "../components/ui/EmptyState";
import { Scissors } from "lucide-react";
import { useTranslation } from "react-i18next";

/** Donatı optimizasyonu — App Store uygulaması */
export function RebarPage() {
  const { t } = useTranslation();
  const { selectedSiteId } = useSite();
  const { installations, loading } = useMarketplaceApps();
  const isInstalled = installations.some((inst) => inst.app.slug === "rebar");

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

  if (loading) {
    return <p className="text-muted">{t("common.loading")}</p>;
  }

  if (!isInstalled) {
    return (
      <div className="page-stack">
        <PageHeader title={t("rebar.title")} subtitle={t("rebar.subtitle")} />
        <EmptyState
          icon={<Scissors size={28} />}
          title={t("applications.notInstalledTitle")}
          description={t("applications.notInstalledDesc")}
          action={
            <Link to="/applications" className="btn-primary">
              {t("applications.goToStore")}
            </Link>
          }
        />
      </div>
    );
  }

  return <ProjectDetailPage embeddedSiteId={selectedSiteId} />;
}
