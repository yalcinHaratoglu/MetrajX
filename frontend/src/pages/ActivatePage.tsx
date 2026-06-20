import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Card } from "../components/ui/Card";
import { authService } from "../services/authService";

export function ActivatePage() {
  const { token } = useParams<{ token: string }>();
  const { t } = useTranslation();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    const activate = async () => {
      if (!token) {
        setStatus("error");
        return;
      }
      try {
        await authService.activate(token);
        setStatus("success");
      } catch {
        setStatus("error");
      }
    };
    void activate();
  }, [token]);

  return (
    <div className="page-center">
      <Card variant="narrow" className="text-center">
        {status === "loading" && <p>{t("auth.activateLoading")}</p>}
        {status === "success" && (
          <>
            <p className="text-success mb-4">{t("auth.activateSuccess")}</p>
            <Link to="/login" className="link-primary">
              {t("auth.login")}
            </Link>
          </>
        )}
        {status === "error" && (
          <>
            <p className="text-error mb-4">{t("auth.activateError")}</p>
            <Link to="/login" className="link-primary">
              {t("auth.login")}
            </Link>
          </>
        )}
      </Card>
    </div>
  );
}
