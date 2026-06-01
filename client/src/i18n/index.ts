import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import HttpBackend from "i18next-http-backend";
import LanguageDetector from "i18next-browser-languagedetector";

export const NAMESPACES = [
  "common", "home", "scenario1", "scenario2", "scenario3",
  "completed", "saltNexus", "leaderboard", "challenge",
] as const;

i18n
  .use(HttpBackend)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: "en",
    supportedLngs: ["en", "pt-BR"],
    load: "currentOnly",
    ns: NAMESPACES as unknown as string[],
    defaultNS: "common",
    backend: { loadPath: "/locales/{{lng}}/{{ns}}.json" },
    detection: { order: ["localStorage"], caches: ["localStorage"], lookupLocalStorage: "salt-locale" },
    interpolation: { escapeValue: false },
    react: { useSuspense: false },
  });

export default i18n;
