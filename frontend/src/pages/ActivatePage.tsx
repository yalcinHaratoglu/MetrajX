import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Card } from "../components/ui/Card";
import { authService } from "../services/authService";

export function ActivatePage() {
  const { token } = useParams<{ token: string }>();
  const { t } = useTranslation();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");

  useEffect(() => {
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
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md text-center">
        {status === "loading" && <p>{t("auth.activateLoading")}</p>}
        {status === "success" && (
          <>
            <p className="mb-4 text-green-600">{t("auth.activateSuccess")}</p>
            <Link to="/login" className="text-[rgb(var(--color-primary))] hover:underline">
              {t("auth.login")}
            </Link>
          </>
        )}
        {status === "error" && <p className="text-red-500">{t("auth.activateError")}</p>}
      </Card>
    </div>
  );
}
