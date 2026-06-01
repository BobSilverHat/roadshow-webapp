import { useTranslation } from "react-i18next";

const LANGS: { code: string; label: string }[] = [
  { code: "en", label: "EN" },
  { code: "pt-BR", label: "PT" },
];

export default function LanguageToggle() {
  const { i18n } = useTranslation();
  const current = i18n.language?.startsWith("pt") ? "pt-BR" : "en";
  return (
    <div
      style={{
        display: "inline-flex",
        gap: "0.25rem",
        fontFamily: "'Barlow Condensed', sans-serif",
        fontSize: "0.72rem",
        fontWeight: 700,
        letterSpacing: "0.18em",
      }}
    >
      {LANGS.map(({ code, label }) => (
        <button
          key={code}
          onClick={() => i18n.changeLanguage(code)}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: "0.15rem 0.3rem",
            color: current === code ? "var(--color-accent-text-bright)" : "var(--muted-foreground)",
          }}
          aria-pressed={current === code}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
