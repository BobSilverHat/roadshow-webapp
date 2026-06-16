/**
 * AdminPanel — the operator GUI for the Salt roadshow workshop.
 *
 * A controlled Radix Dialog with two faces: a PIN gate, and (once
 * unlocked) a live dashboard + grouped controls. The dashboard reads the
 * single workshop clock from useWorkshopClock() for the phase badge /
 * countdown, and the attendee roster + counts from useAdmin()'s polled
 * status. Every mutating control routes through useAdmin actions, each of
 * which returns Promise<{ok, error?}>.
 *
 * ENGLISH ONLY: this panel deliberately avoids the app's translation
 * layer. The locale switch is global, so a translated string here would
 * flip the whole operator UI to whatever locale the room is set to. All
 * copy below is a plain English literal on purpose.
 */

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { useAdmin } from "@/hooks/useAdmin";
import { useWorkshopClock } from "@/hooks/useWorkshopClock";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Map known RPC error codes to operator-readable copy. Unknown codes
 *  fall through to the raw string so nothing is silently swallowed. */
function humanError(code?: string): string {
  switch (code) {
    case "unauthorized":
      return "Session expired — re-enter PIN";
    case "workshop_live":
      return "Close the challenge first";
    case "bad_duration":
      return "Duration must be 5–180 minutes";
    case "weak_pin":
      return "PIN must be at least 10 characters";
    default:
      return code ?? "Something went wrong";
  }
}

/** ms → "mm:ss"; null/undefined → "—". */
function fmtMs(ms: number | null | undefined): string {
  if (ms == null) return "—";
  const total = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

/** CSV-escape a single field (RFC-4180-ish: quote when needed). */
function csvField(v: string | number | null | undefined): string {
  const s = v == null ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

// ---------------------------------------------------------------------------
// Inline-style tokens (cyber-noir, matches the rest of the app)
// ---------------------------------------------------------------------------

const labelStyle: React.CSSProperties = {
  fontFamily: "'Barlow Condensed', sans-serif",
  fontSize: "0.7rem",
  fontWeight: 700,
  letterSpacing: "0.25em",
  textTransform: "uppercase",
  color: "var(--muted-foreground)",
};

const sectionStyle: React.CSSProperties = {
  borderTop: "1px solid var(--border)",
  paddingTop: "0.9rem",
  marginTop: "0.9rem",
  display: "flex",
  flexDirection: "column",
  gap: "0.6rem",
};

const monoStyle: React.CSSProperties = {
  fontFamily: "'IBM Plex Mono', ui-monospace, monospace",
};

const chipBase: React.CSSProperties = {
  ...monoStyle,
  display: "inline-flex",
  alignItems: "center",
  gap: "0.35rem",
  fontSize: "0.68rem",
  fontWeight: 600,
  letterSpacing: "0.08em",
  padding: "0.2rem 0.5rem",
  borderRadius: "4px",
  whiteSpace: "nowrap",
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function AdminPanel({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const admin = useAdmin(open);
  const clock = useWorkshopClock();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="bg-background"
        style={{
          width: "420px",
          maxWidth: "calc(100% - 2rem)",
          maxHeight: "85vh",
          overflowY: "auto",
        }}
      >
        <DialogHeader>
          <DialogTitle
            style={{
              fontFamily: "'Barlow Condensed', sans-serif",
              letterSpacing: "0.3em",
              textTransform: "uppercase",
              fontWeight: 700,
            }}
          >
            Admin
          </DialogTitle>
        </DialogHeader>

        {admin.unlocked ? (
          <Dashboard admin={admin} clock={clock} />
        ) : (
          <PinGate admin={admin} />
        )}
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// PIN gate
// ---------------------------------------------------------------------------

function PinGate({ admin }: { admin: ReturnType<typeof useAdmin> }) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  async function submit() {
    if (busy || !pin) return;
    setBusy(true);
    setError(null);
    const res = await admin.unlock(pin);
    setBusy(false);
    if (!res.ok) {
      // Deliberately generic — never reveal whether the PIN was close.
      setError("Incorrect PIN.");
      setPin("");
    }
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}
    >
      <span style={labelStyle}>Operator PIN</span>
      <Input
        ref={inputRef}
        type="password"
        value={pin}
        onChange={(e) => setPin(e.target.value)}
        placeholder="Enter PIN"
        autoComplete="off"
        disabled={busy}
        style={monoStyle}
      />
      {error && (
        <span style={{ ...monoStyle, fontSize: "0.78rem", color: "var(--destructive)" }}>
          {error}
        </span>
      )}
      <Button type="submit" disabled={busy || !pin}>
        {busy ? "Unlocking…" : "Unlock"}
      </Button>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------

type Admin = ReturnType<typeof useAdmin>;
type Clock = ReturnType<typeof useWorkshopClock>;

function Dashboard({ admin, clock }: { admin: Admin; clock: Clock }) {
  // Per-action pending guard. Keyed by an action name so we can disable just
  // the control that's in flight without locking the whole panel.
  const [pending, setPending] = useState<Record<string, boolean>>({});

  /** Run a useAdmin action with a pending guard + toast on resolve. */
  async function run(
    key: string,
    fn: () => Promise<{ ok: boolean; error?: string }>,
    successMsg: string,
  ): Promise<{ ok: boolean; error?: string }> {
    if (pending[key]) return { ok: false, error: "busy" };
    setPending((p) => ({ ...p, [key]: true }));
    let res: { ok: boolean; error?: string };
    try {
      res = await fn();
    } catch (e) {
      res = { ok: false, error: e instanceof Error ? e.message : "error" };
    }
    setPending((p) => ({ ...p, [key]: false }));
    if (res.ok) toast.success(successMsg);
    else toast.error(humanError(res.error));
    return res;
  }

  const isPending = (k: string) => !!pending[k];

  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      <LiveStatus admin={admin} clock={clock} />
      <GateAndTimer clock={clock} admin={admin} run={run} isPending={isPending} />
      <Phases clock={clock} admin={admin} run={run} isPending={isPending} />
      <LanguageSection clock={clock} admin={admin} run={run} isPending={isPending} />
      <DangerZone admin={admin} run={run} isPending={isPending} />
      <ChangePin admin={admin} setPending={setPending} pending={pending} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Live status: phase badge + nexus chip + countdown + counts + roster
// ---------------------------------------------------------------------------

function LiveStatus({ admin, clock }: { admin: Admin; clock: Clock }) {
  // Phase badge precedence: review mode wins, then closed/expired, else live.
  let phaseLabel: string;
  let phaseColor: string;
  if (clock.reviewMode) {
    phaseLabel = "REVIEW MODE (timer off)";
    phaseColor = "oklch(0.75 0.18 85)"; // amber
  } else if (clock.status === "closed") {
    phaseLabel = "CLOSED";
    phaseColor = "var(--muted-foreground)";
  } else if (clock.status === "expired") {
    phaseLabel = "EXPIRED";
    phaseColor = "var(--destructive)";
  } else {
    phaseLabel = "IN PROGRESS";
    phaseColor = "oklch(0.78 0.2 145)"; // green
  }

  const counts = admin.status?.counts;
  const attendees = admin.status?.attendees;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
      {/* Badges row */}
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
        <span
          style={{
            ...chipBase,
            color: phaseColor,
            border: `1px solid ${phaseColor}`,
            background: "oklch(from var(--card) l c h / 0.4)",
          }}
        >
          {phaseLabel}
        </span>
        <span
          style={{
            ...chipBase,
            color: clock.nexusOpen ? "oklch(0.78 0.2 145)" : "var(--muted-foreground)",
            border: `1px solid ${
              clock.nexusOpen ? "oklch(0.78 0.2 145)" : "var(--border)"
            }`,
          }}
        >
          {clock.nexusOpen ? "NEXUS OPEN" : "NEXUS CLOSED"}
        </span>
        {admin.stale && (
          <span
            style={{
              ...chipBase,
              color: "oklch(0.75 0.18 85)",
              border: "1px solid oklch(0.75 0.18 85)",
            }}
          >
            STALE
          </span>
        )}
      </div>

      {/* Countdown */}
      <div style={{ display: "flex", alignItems: "baseline", gap: "0.6rem" }}>
        <span style={labelStyle}>Remaining</span>
        <span
          style={{
            ...monoStyle,
            fontSize: "1.4rem",
            fontWeight: 700,
            letterSpacing: "0.04em",
            color: clock.reviewMode ? "var(--muted-foreground)" : "var(--foreground)",
          }}
        >
          {clock.reviewMode ? "—" : fmtMs(clock.remainingMs)}
        </span>
      </div>

      {/* Counts */}
      {admin.status === null ? (
        <Skeleton style={{ height: "1.2rem", width: "70%" }} />
      ) : (
        <div style={{ ...monoStyle, fontSize: "0.78rem", color: "var(--muted-foreground)" }}>
          registered {counts?.registered ?? 0} · begun {counts?.begun ?? 0} · finished both{" "}
          {counts?.finished_both ?? 0}
        </div>
      )}

      {/* Standings */}
      {admin.status === null ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
          <Skeleton style={{ height: "1.1rem", width: "100%" }} />
          <Skeleton style={{ height: "1.1rem", width: "100%" }} />
          <Skeleton style={{ height: "1.1rem", width: "100%" }} />
        </div>
      ) : attendees && attendees.length > 0 ? (
        <div style={{ overflowX: "auto" }}>
          <table style={{ ...monoStyle, fontSize: "0.72rem", width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ color: "var(--muted-foreground)", textAlign: "left" }}>
                <th style={thStyle}>#</th>
                <th style={thStyle}>Name</th>
                <th style={thStyle}>Q</th>
                <th style={thStyle}>Time</th>
                <th style={thStyle}>Wrong</th>
                <th style={thStyle}>Hints</th>
              </tr>
            </thead>
            <tbody>
              {attendees.map((a, i) => (
                <tr key={a.id} style={{ borderTop: "1px solid var(--border)" }}>
                  <td style={tdStyle}>{i + 1}</td>
                  <td style={tdStyle}>{a.name}</td>
                  <td style={tdStyle}>{a.questions_complete}/10</td>
                  <td style={tdStyle}>{fmtMs(a.total_ms)}</td>
                  <td style={tdStyle}>{a.wrong_count ?? 0}</td>
                  <td style={tdStyle}>{a.hints_used ?? 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <span style={{ ...monoStyle, fontSize: "0.78rem", color: "var(--muted-foreground)" }}>
          No attendees yet.
        </span>
      )}
    </div>
  );
}

const thStyle: React.CSSProperties = {
  padding: "0.25rem 0.4rem",
  fontWeight: 600,
  whiteSpace: "nowrap",
};
const tdStyle: React.CSSProperties = {
  padding: "0.3rem 0.4rem",
  whiteSpace: "nowrap",
};

// ---------------------------------------------------------------------------
// Gate & Timer
// ---------------------------------------------------------------------------

type RunFn = (
  key: string,
  fn: () => Promise<{ ok: boolean; error?: string }>,
  successMsg: string,
) => Promise<{ ok: boolean; error?: string }>;

function GateAndTimer({
  clock,
  admin,
  run,
  isPending,
}: {
  clock: Clock;
  admin: Admin;
  run: RunFn;
  isPending: (k: string) => boolean;
}) {
  // When review mode is on, opening the gate needs a 3-way decision first.
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [duration, setDurationLocal] = useState<number>(clock.durationMinutes);

  // Keep the local duration field in sync with the persisted value while the
  // field isn't being actively driven through a "Set" (status === closed lets
  // operators edit; otherwise just mirror).
  useEffect(() => {
    setDurationLocal(clock.durationMinutes);
  }, [clock.durationMinutes]);

  const durationDisabled = clock.status !== "closed";

  async function openChallenge() {
    if (clock.reviewMode) {
      setConfirmOpen(true);
      return;
    }
    await run("open", () => admin.openChallenge(), "Challenge opened — clock started");
  }

  async function setDuration() {
    const clamped = Math.max(5, Math.min(180, Math.round(duration) || 5));
    setDurationLocal(clamped);
    await run("duration", () => admin.setDuration(clamped), `Duration set to ${clamped} min`);
  }

  return (
    <div style={sectionStyle}>
      <span style={labelStyle}>Gate &amp; Timer</span>

      {confirmOpen ? (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "0.5rem",
            border: "1px solid oklch(0.75 0.18 85)",
            borderRadius: "6px",
            padding: "0.7rem",
          }}
        >
          <span style={{ ...monoStyle, fontSize: "0.78rem" }}>
            Review mode is ON. The timer is disabled while it&apos;s on.
          </span>
          <Button
            size="sm"
            disabled={isPending("open")}
            onClick={async () => {
              setConfirmOpen(false);
              const r1 = await run(
                "open",
                () => admin.setReviewMode(false),
                "Review mode off",
              );
              if (r1.ok) {
                await run("open", () => admin.openChallenge(), "Challenge opened — clock started");
              }
            }}
          >
            Turn off review mode &amp; open
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={isPending("open")}
            onClick={async () => {
              setConfirmOpen(false);
              await run("open", () => admin.openChallenge(), "Challenge opened (review mode)");
            }}
          >
            Open in review mode
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setConfirmOpen(false)}>
            Cancel
          </Button>
        </div>
      ) : (
        <Button disabled={isPending("open")} onClick={openChallenge}>
          Open challenge &amp; start clock
        </Button>
      )}

      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
        <Button
          size="sm"
          variant="outline"
          disabled={isPending("close")}
          onClick={() => run("close", () => admin.closeChallenge(), "Gate closed")}
        >
          Close gate
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={isPending("restart")}
          onClick={() => run("restart", () => admin.restartTimer(), "Timer restarted")}
        >
          Restart timer
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={isPending("plus5")}
          onClick={() => run("plus5", () => admin.adjustTimer(5), "+5 min")}
        >
          +5 min
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={isPending("minus5")}
          onClick={() => run("minus5", () => admin.adjustTimer(-5), "−5 min")}
        >
          −5 min
        </Button>
      </div>

      {/* Duration */}
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
        <span style={labelStyle}>Duration (min)</span>
        {durationDisabled ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <div style={{ display: "flex", gap: "0.5rem", flex: 1, opacity: 0.55 }}>
                <Input
                  type="number"
                  value={duration}
                  disabled
                  style={{ ...monoStyle, width: "5rem" }}
                />
                <Button size="sm" variant="outline" disabled>
                  Set
                </Button>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              Close the challenge to change duration; use ±5 to adjust a running clock
            </TooltipContent>
          </Tooltip>
        ) : (
          <div style={{ display: "flex", gap: "0.5rem", flex: 1 }}>
            <Input
              type="number"
              min={5}
              max={180}
              value={duration}
              onChange={(e) => setDurationLocal(Number(e.target.value))}
              style={{ ...monoStyle, width: "5rem" }}
            />
            <Button
              size="sm"
              variant="outline"
              disabled={isPending("duration")}
              onClick={setDuration}
            >
              Set
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Phases (review mode + nexus)
// ---------------------------------------------------------------------------

function Phases({
  clock,
  admin,
  run,
  isPending,
}: {
  clock: Clock;
  admin: Admin;
  run: RunFn;
  isPending: (k: string) => boolean;
}) {
  return (
    <div style={sectionStyle}>
      <span style={labelStyle}>Phases</span>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ ...monoStyle, fontSize: "0.82rem" }}>Review mode</span>
        <Switch
          checked={clock.reviewMode}
          disabled={isPending("review")}
          onCheckedChange={(on) =>
            run("review", () => admin.setReviewMode(on), on ? "Review mode on" : "Review mode off")
          }
        />
      </div>
      {clock.reviewMode && (
        <span
          style={{
            ...monoStyle,
            fontSize: "0.74rem",
            color: "oklch(0.78 0.16 85)",
          }}
        >
          ⚠ Timer OFF — submissions never expire
        </span>
      )}

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ ...monoStyle, fontSize: "0.82rem" }}>Nexus open</span>
        <Switch
          checked={clock.nexusOpen}
          disabled={isPending("nexus")}
          onCheckedChange={(on) =>
            run("nexus", () => admin.setNexusOpen(on), on ? "Nexus open" : "Nexus closed")
          }
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Language
// ---------------------------------------------------------------------------

function LanguageSection({
  clock,
  admin,
  run,
  isPending,
}: {
  clock: Clock;
  admin: Admin;
  run: RunFn;
  isPending: (k: string) => boolean;
}) {
  // Track optimistically; seed from the persisted clock value, default "en".
  const [locale, setLocale] = useState<string>(clock.defaultLocale || "en");

  useEffect(() => {
    setLocale(clock.defaultLocale || "en");
  }, [clock.defaultLocale]);

  return (
    <div style={sectionStyle}>
      <span style={labelStyle}>Default language</span>
      <ToggleGroup
        type="single"
        variant="outline"
        value={locale}
        disabled={isPending("locale")}
        onValueChange={(v) => {
          if (!v || v === locale) return;
          const prev = locale;
          setLocale(v); // optimistic
          run("locale", () => admin.setDefaultLocale(v), `Default language → ${v}`).then((res) => {
            if (!res.ok) setLocale(prev); // revert on failure
          });
        }}
      >
        <ToggleGroupItem value="en">EN</ToggleGroupItem>
        <ToggleGroupItem value="pt-BR">PT-BR</ToggleGroupItem>
      </ToggleGroup>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Danger Zone
// ---------------------------------------------------------------------------

function DangerZone({
  admin,
  run,
  isPending,
}: {
  admin: Admin;
  run: RunFn;
  isPending: (k: string) => boolean;
}) {
  const [confirmText, setConfirmText] = useState("");

  async function exportCsv() {
    // Pull a FRESH snapshot — the polled status could be a few seconds stale.
    const res = await admin.refresh();
    if (!res.ok) {
      toast.error(humanError(res.error));
      return;
    }
    const attendees = admin.status?.attendees ?? [];
    const header = "rank,name,email,questions_complete,total_ms,wrong_count,hints_used,registered_at";
    const rows = attendees.map((a, i) =>
      [
        i + 1,
        csvField(a.name),
        csvField(a.email),
        a.questions_complete,
        a.total_ms ?? "",
        a.wrong_count ?? "",
        a.hints_used ?? "",
        csvField(a.created_at),
      ].join(","),
    );
    const csv = [header, ...rows].join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `workshop-standings-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("CSV exported");
  }

  const canClear = confirmText === "CLEAR";

  return (
    <div
      style={{
        ...sectionStyle,
        borderTop: "1px solid var(--destructive)",
      }}
    >
      <span style={{ ...labelStyle, color: "var(--destructive)" }}>Danger zone</span>

      <Button
        size="sm"
        variant="outline"
        onClick={exportCsv}
      >
        Export CSV first
      </Button>

      <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
        <span style={{ ...monoStyle, fontSize: "0.74rem", color: "var(--muted-foreground)" }}>
          Type <strong>CLEAR</strong> to wipe all attendee data.
        </span>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <Input
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder="CLEAR"
            autoComplete="off"
            style={{ ...monoStyle, flex: 1 }}
          />
          <Button
            variant="destructive"
            disabled={!canClear || isPending("clear")}
            onClick={async () => {
              const res = await run("clear", () => admin.clearData(), "All data cleared");
              if (res.ok) setConfirmText("");
            }}
          >
            Clear all data
          </Button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Change PIN
// ---------------------------------------------------------------------------

function ChangePin({
  admin,
  pending,
  setPending,
}: {
  admin: Admin;
  pending: Record<string, boolean>;
  setPending: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
}) {
  const [oldPin, setOldPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const busy = !!pending["pin"];

  async function changePin() {
    if (busy || !oldPin || !newPin) return;
    setPending((p) => ({ ...p, pin: true }));
    let res: { ok: boolean; error?: string };
    try {
      res = await admin.changePin(oldPin, newPin);
    } catch (e) {
      res = { ok: false, error: e instanceof Error ? e.message : "error" };
    }
    setPending((p) => ({ ...p, pin: false }));
    if (res.ok) {
      toast.success("PIN changed");
      setOldPin("");
      setNewPin("");
    } else {
      toast.error(humanError(res.error));
    }
  }

  return (
    <div style={sectionStyle}>
      <span style={labelStyle}>Change PIN</span>
      <Input
        type="password"
        value={oldPin}
        onChange={(e) => setOldPin(e.target.value)}
        placeholder="Current PIN"
        autoComplete="off"
        disabled={busy}
        style={monoStyle}
      />
      <Input
        type="password"
        value={newPin}
        onChange={(e) => setNewPin(e.target.value)}
        placeholder="New PIN (min 10 chars)"
        autoComplete="off"
        disabled={busy}
        style={monoStyle}
      />
      <Button
        size="sm"
        variant="outline"
        disabled={busy || !oldPin || !newPin}
        onClick={changePin}
      >
        {busy ? "Changing…" : "Change PIN"}
      </Button>
    </div>
  );
}
