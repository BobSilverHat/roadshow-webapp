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

// Keep <html lang> in sync with the active locale (correct hyphenation,
// accessibility, and screen-reader pronunciation). Glyph coverage is fine
// for both faces (see i18n/glossary.md) so no font fallback is keyed on this.
function syncHtmlLang(lng: string) {
  if (typeof document !== "undefined") {
    document.documentElement.lang = lng?.startsWith("pt") ? "pt-BR" : "en";
  }
}
syncHtmlLang(i18n.language);
i18n.on("languageChanged", syncHtmlLang);

export default i18n;
