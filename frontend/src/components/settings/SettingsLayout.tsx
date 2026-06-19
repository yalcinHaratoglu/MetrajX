import type { ReactNode } from "react";
import {
  Building2,
  KeyRound,
  MessageSquare,
  Palette,
  User,
  Users,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { AppearanceForm } from "./AppearanceForm";
import { CompanyForm } from "./CompanyForm";
import { FeedbackForm } from "./FeedbackForm";
import { PasswordForm } from "./PasswordForm";
import { ProfileForm } from "./ProfileForm";
import { TeamManagement } from "./TeamManagement";

export type SettingsTab = "profile" | "security" | "company" | "users" | "appearance" | "feedback";

interface SettingsNavProps {
  active: SettingsTab;
  onChange: (tab: SettingsTab) => void;
}

const tabs: { id: SettingsTab; icon: typeof User; labelKey: string }[] = [
  { id: "profile", icon: User, labelKey: "settings.tabs.profile" },
  { id: "security", icon: KeyRound, labelKey: "settings.tabs.security" },
  { id: "company", icon: Building2, labelKey: "settings.tabs.company" },
  { id: "users", icon: Users, labelKey: "settings.tabs.users" },
  { id: "appearance", icon: Palette, labelKey: "settings.tabs.appearance" },
  { id: "feedback", icon: MessageSquare, labelKey: "settings.tabs.feedback" },
];

export function SettingsNav({ active, onChange }: SettingsNavProps) {
  const { t } = useTranslation();

  return (
    <nav className="settings-nav surface-card">
      {tabs.map(({ id, icon: Icon, labelKey }) => (
        <button
          key={id}
          type="button"
          className={active === id ? "settings-nav-item-active" : "settings-nav-item"}
          onClick={() => onChange(id)}
        >
          <Icon size={18} />
          {t(labelKey)}
        </button>
      ))}
    </nav>
  );
}

interface SettingsPanelProps {
  tab: SettingsTab;
}

export function SettingsPanel({ tab }: SettingsPanelProps) {
  const { t } = useTranslation();

  const panels: Record<SettingsTab, { title: string; desc: string; content: ReactNode }> = {
    profile: {
      title: t("settings.profile.title"),
      desc: t("settings.profile.desc"),
      content: <ProfileForm />,
    },
    security: {
      title: t("settings.password.title"),
      desc: t("settings.password.desc"),
      content: <PasswordForm />,
    },
    company: {
      title: t("settings.company.title"),
      desc: t("settings.company.desc"),
      content: <CompanyForm />,
    },
    users: {
      title: t("settings.team.title"),
      desc: t("settings.team.desc"),
      content: <TeamManagement />,
    },
    appearance: {
      title: t("settings.appearance.title"),
      desc: t("settings.appearance.desc"),
      content: <AppearanceForm />,
    },
    feedback: {
      title: t("settings.feedback.title"),
      desc: t("settings.feedback.desc"),
      content: <FeedbackForm />,
    },
  };

  const panel = panels[tab];

  return (
    <div className="settings-panel surface-card">
      <div className="settings-panel-header">
        <h2 className="settings-panel-title">{panel.title}</h2>
        <p className="settings-panel-desc">{panel.desc}</p>
      </div>
      {panel.content}
    </div>
  );
}
