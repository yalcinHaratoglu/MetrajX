import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  SettingsNav,
  SettingsPanel,
  type SettingsTab,
} from "../components/settings/SettingsLayout";
import { PageHeader } from "../components/layout/PageHeader";

export function SettingsPage() {
  const { t } = useTranslation();
  const [tab, setTab] = useState<SettingsTab>("profile");

  return (
    <div className="settings-page">
      <PageHeader title={t("settings.title")} subtitle={t("settings.subtitle")} />

      <div className="settings-layout">
        <SettingsNav active={tab} onChange={setTab} />
        <SettingsPanel tab={tab} />
      </div>
    </div>
  );
}
