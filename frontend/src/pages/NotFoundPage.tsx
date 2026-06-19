import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Home } from "lucide-react";
import { Button } from "../components/ui/Button";

export function NotFoundPage() {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <p className="not-found-code">404</p>
      <h1 className="section-title mt-4">{t("notFound.title")}</h1>
      <p className="section-subtitle mt-2 max-w-md">{t("notFound.description")}</p>
      <div className="mt-8 flex items-center justify-center gap-3">
        <Link to="/dashboard">
          <Button>
            <Home size={16} />
            {t("notFound.backHome")}
          </Button>
        </Link>
        <button type="button" className="btn-ghost" onClick={() => window.history.back()}>
          <ArrowLeft size={16} />
          {t("notFound.goBack")}
        </button>
      </div>
    </div>
  );
}
