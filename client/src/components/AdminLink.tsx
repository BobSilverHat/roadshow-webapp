import { useEffect, useState } from "react";
import AdminPanel from "@/components/AdminPanel";

/**
 * Discreet "admin" link docked at the bottom of the sidebar, plus a
 * ⌘/Ctrl+Shift+A chord that opens the same panel (useful when the screen is
 * projected and the tiny link is hard to click). Owns the open state and
 * renders the AdminPanel. The link's visibility is NOT a security control —
 * every admin action is PIN-gated server-side.
 */
export default function AdminLink() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const mod = e.metaKey || e.ctrlKey;
      if (!mod || !e.shiftKey || e.key.toLowerCase() !== "a") return;
      if (e.repeat) return;
      const el = document.activeElement;
      const typing = el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement;
      if (typing || open) return;
      e.preventDefault();
      setOpen(true);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open admin panel"
        style={{
          background: "none",
          border: "none",
          cursor: "pointer",
          padding: "0.15rem 0",
          marginTop: "0.5rem",
          fontFamily: "'Barlow Condensed', sans-serif",
          fontSize: "0.6rem",
          fontWeight: 700,
          letterSpacing: "0.22em",
          textTransform: "uppercase",
          color: "var(--muted-foreground)",
          opacity: 0.5,
        }}
      >
        admin
      </button>
      <AdminPanel open={open} onOpenChange={setOpen} />
    </>
  );
}
