/**
 * ZoomableImage — click a thumbnail to open a full-viewport zoomed view.
 *
 * Behavior:
 *   - Click thumbnail: image scales up inside a darkened + blurred backdrop
 *   - Click backdrop / press Escape: closes with reverse animation
 *   - Clicking the zoomed image itself does nothing (event propagation is
 *     stopped), so the overlay doesn't close when you click on the image
 *   - Body scroll is locked while open so the page doesn't move behind it
 *
 * Uses framer-motion's `AnimatePresence` for mount/unmount animations and a
 * spring transition for the zoom curve (feels physical, not linear).
 * Matches the project's cyber-noir palette — dark purple-tinted backdrop,
 * subtle purple glow on the zoomed image.
 */
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

interface ZoomableImageProps {
  src: string;
  alt: string;
  style?: React.CSSProperties;
}

export default function ZoomableImage({ src, alt, style }: ZoomableImageProps) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    // Lock body scroll so the page underneath doesn't move while zoomed
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open]);

  return (
    <>
      <motion.img
        src={src}
        alt={alt}
        onClick={() => setOpen(true)}
        whileHover={{ scale: 1.005 }}
        transition={{ duration: 0.2 }}
        style={{
          ...style,
          cursor: "zoom-in",
        }}
      />

      <AnimatePresence>
        {open && (
          <motion.div
            key="zoom-backdrop"
            onClick={() => setOpen(false)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            style={{
              // Offset to main-content area so the backdrop + zoomed image
              // don't overlap the fixed navbar (top 70px) or the fixed
              // sidebar (dynamic, exposed as --sidebar-width by
              // WorkshopLayout). Falls back to sensible defaults if the
              // CSS vars aren't set (e.g. standalone usage).
              position: "fixed",
              top: "var(--navbar-height, 70px)",
              left: "var(--sidebar-width, 200px)",
              right: 0,
              bottom: 0,
              zIndex: 100,
              backgroundColor: "rgba(10,10,15,0.9)",
              backdropFilter: "blur(14px)",
              WebkitBackdropFilter: "blur(14px)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "zoom-out",
              padding: "2rem",
            }}
          >
            {/* Small hint label — lives on the backdrop, not the image */}
            <motion.span
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ delay: 0.15, duration: 0.25 }}
              style={{
                position: "absolute",
                top: "1.25rem",
                left: "50%",
                transform: "translateX(-50%)",
                fontFamily: "'Barlow Condensed', sans-serif",
                fontSize: "0.7rem",
                fontWeight: 600,
                letterSpacing: "0.2em",
                textTransform: "uppercase",
                color: "rgba(200,200,220,0.55)",
                pointerEvents: "none",
                userSelect: "none",
              }}
            >
              Click anywhere or press Esc to close
            </motion.span>

            <motion.img
              src={src}
              alt={alt}
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.92, opacity: 0 }}
              transition={{ type: "spring", stiffness: 240, damping: 26 }}
              onClick={(e) => e.stopPropagation()}
              style={{
                // Sensible upper caps so the image doesn't balloon to the
                // full backdrop on large viewports — keeps a breathing
                // margin even when the user's monitor is huge.
                maxWidth: "min(100%, 1100px)",
                maxHeight: "min(100%, 80vh)",
                objectFit: "contain",
                borderRadius: "8px",
                border: "1px solid rgba(255,255,255,0.12)",
                boxShadow:
                  "0 40px 120px rgba(124,58,237,0.22), 0 10px 40px rgba(0,0,0,0.55)",
                cursor: "default",
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
