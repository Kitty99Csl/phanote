import { useState, useEffect } from "react";

// Inline hook — same logic as useKeyboardOffset in App.jsx.
// Duplicated here to avoid circular imports. Will consolidate in hooks refactor.
const useKeyboardOffset = () => {
  const [offset, setOffset] = useState(0);
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const update = () => {
      const kh = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
      setOffset(kh);
    };
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    return () => {
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
    };
  }, []);
  return offset;
};

export default function Sheet({
  open,
  onClose,
  title,
  children,
  footer,
  maxHeight = "88dvh",
  showCloseButton = true,
}) {
  const kbOffset = useKeyboardOffset();

  if (!open) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        background: "rgba(30,30,40,0.6)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
        paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 72px)",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          background: "#fff",
          borderRadius: "28px 28px 0 0",
          width: "100%",
          maxWidth: 430,
          maxHeight,
          display: "flex",
          flexDirection: "column",
          animation: "slideUp .3s ease",
          transform:
            kbOffset > 0 ? `translateY(-${kbOffset}px)` : undefined,
          transition: "transform .25s ease",
        }}
      >
        {/* ── Header zone (fixed) ── */}
        {(title || showCloseButton) && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "20px 24px 12px",
              flexShrink: 0,
            }}
          >
            {title ? (
              <div
                style={{
                  fontSize: 15,
                  fontWeight: 700,
                  color: "#2D2D3A",
                  fontFamily: "'Noto Sans', sans-serif",
                }}
              >
                {title}
              </div>
            ) : (
              <div />
            )}
            {showCloseButton && (
              <button
                onClick={onClose}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 10,
                  border: "none",
                  background: "rgba(155,155,173,0.12)",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 16,
                  color: "#9B9BAD",
                  flexShrink: 0,
                }}
              >
                ✕
              </button>
            )}
          </div>
        )}

        {/* ── Content zone (scrollable) ── */}
        <div
          style={{
            flex: 1,
            minHeight: 0,
            overflowY: "auto",
            padding: "0 24px",
            WebkitOverflowScrolling: "touch",
          }}
        >
          {children}
        </div>

        {/* ── Footer zone (pinned) ── */}
        {footer && (
          <div
            style={{
              flexShrink: 0,
              padding: "16px 24px",
              paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 16px)",
            }}
          >
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
