/**
 * Small yellow lightbulb pinned to the top-right of an unsolved
 * QuestionCard. Inline SVG (no react-icons dep). Pulses softly while
 * hints remain. Hidden by the parent when isSolved || locked || allUsed.
 */

import { motion } from "framer-motion";

interface Props {
  onClick: () => void;
  /** True when the user has paid for at least one hint on this question
   *  but more remain. Subtly de-emphasizes the pulse. */
  partiallyUsed?: boolean;
}

export default function HintBulbButton({ onClick, partiallyUsed }: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Reveal a hint"
      style={{
        position: "absolute",
        top: "0.85rem",
        right: "1rem",
        background: "none",
        border: "none",
        padding: 0,
        cursor: "pointer",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: 24,
        height: 24,
        zIndex: 2,
        outline: "none",
      }}
    >
      <motion.svg
        viewBox="0 0 24 24"
        width={18}
        height={18}
        fill="var(--color-hint-bulb)"
        aria-hidden="true"
        animate={
          partiallyUsed
            ? { opacity: 0.7 }
            : {
                opacity: [0.65, 1, 0.65],
                filter: [
                  "drop-shadow(0 0 4px var(--color-hint-bulb-glow))",
                  "drop-shadow(0 0 10px var(--color-hint-bulb-glow))",
                  "drop-shadow(0 0 4px var(--color-hint-bulb-glow))",
                ],
              }
        }
        transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
      >
        {/* FaLightbulb-style glyph (solid bulb with filament arc). */}
        <path d="M9 21v-1h6v1a2 2 0 0 1-2 2h-2a2 2 0 0 1-2-2zm-2-7.5C5.5 12 5 10.5 5 9a7 7 0 0 1 14 0c0 1.5-.5 3-2 4.5-1 1-1.5 2-1.5 3.5v.5h-5V17c0-1.5-.5-2.5-1.5-3.5z" />
      </motion.svg>
    </button>
  );
}
