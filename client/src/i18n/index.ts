import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import HttpBackend from "i18next-http-backend";
import LanguageDetector from "i18next-browser-languagedetector";

export const NAMESPACES = [
  "common", "home", "scenario1", "scenario2", "scenario3",
  "completed", "saltNexus", "leaderboard", "challenge",
] as const;

// `init()` resolves once the initial language's namespaces are loaded.
// main.tsx awaits this before the first render so components never render
// against unloaded namespaces (which would flash raw keys and crash any
// `t(key, { returnObjects: true })` .map call).
export const i18nReady = i18n
  .use(HttpBackend)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: "en",
    supportedLngs: ["en", "pt-BR"],
    load: "currentOnly",
    ns: [...NAMESPACES],
    defaultNS: "common",
    backend: { loadPath: "/locales/{{lng}}/{{ns}}.json" },
    // Detector READS salt-locale but must NOT auto-cache it. NOTE: the
    // detector's default `caches` is ["localStorage"], so we set it to []
    // EXPLICITLY (omitting it keeps the default and still writes). If it
    // wrote, a fresh visitor would get salt-locale on first paint, making
    // WorkshopLayout's "user chose explicitly" guard always true and
    // defeating the per-event default_locale. LanguageToggle persists the
    // key explicitly on an actual user click instead.
    detection: { order: ["localStorage"], caches: [], lookupLocalStorage: "salt-locale" },
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
