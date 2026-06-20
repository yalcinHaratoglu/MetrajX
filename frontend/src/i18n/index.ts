import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import tr from "./locales/tr/translation.json";
import en from "./locales/en/translation.json";

const savedLanguage = localStorage.getItem("conmanage-language") ?? "tr";

i18n.use(initReactI18next).init({
  resources: {
    tr: { translation: tr },
    en: { translation: en },
  },
  lng: savedLanguage,
  fallbackLng: "en",
  interpolation: {
    escapeValue: false,
  },
});

export default i18n;
