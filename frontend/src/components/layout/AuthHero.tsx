import { Boxes, Ruler, Scissors, TrendingDown } from "lucide-react";
import { useTranslation } from "react-i18next";

export function AuthHero() {
  const { t } = useTranslation();

  const features = [
    { icon: Ruler, key: "auth.hero.features.takeoff" },
    { icon: Scissors, key: "auth.hero.features.cutting" },
    { icon: TrendingDown, key: "auth.hero.features.waste" },
  ];

  return (
    <div className="auth-hero">
      <div className="auth-hero-brand">
        <span className="auth-hero-logo">
          <Boxes size={24} />
        </span>
        {t("app.name")}
      </div>

      <div className="auth-hero-content">
        <p className="auth-hero-eyebrow">{t("auth.hero.eyebrow")}</p>
        <h1 className="auth-hero-title">{t("auth.hero.title")}</h1>
        <p className="auth-hero-desc">{t("auth.hero.desc")}</p>
      </div>

      <div className="auth-hero-features">
        {features.map(({ icon: Icon, key }) => (
          <div key={key} className="auth-feature">
            <span className="auth-feature-icon">
              <Icon size={16} />
            </span>
            {t(key)}
          </div>
        ))}
      </div>
    </div>
  );
}
