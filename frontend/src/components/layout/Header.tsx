import { useTranslation } from "react-i18next";
import { useAuth } from "../../hooks/useAuth";

export function Header() {
  const { t } = useTranslation();
  const { user } = useAuth();

  return (
    <header className="border-b px-8 py-5" style={{ borderColor: "rgb(var(--border))" }}>
      <p className="text-sm text-muted">{t("header.welcome")}</p>
      <p className="font-medium">
        {user?.first_name} {user?.last_name}
      </p>
    </header>
  );
}
