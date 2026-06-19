import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  SettingsNav,
  SettingsPanel,
  type SettingsTab,
} from "../components/settings/SettingsLayout";

export function SettingsPage() {
  const { t } = useTranslation();
  const [tab, setTab] = useState<SettingsTab>("profile");

  return (
    <div className="settings-page">
      <div className="settings-page-header">
        <h1 className="section-title">{t("settings.title")}</h1>
        <p className="section-subtitle">{t("settings.subtitle")}</p>
      </div>

      <div className="settings-layout">
        <SettingsNav active={tab} onChange={setTab} />
        <SettingsPanel tab={tab} />
      </div>
    </div>
  );
}
