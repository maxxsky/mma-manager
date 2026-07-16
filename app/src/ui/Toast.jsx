// Toast — broadcast notification system
// Stack auto-dismiss toasts (gold border = achievement)
import React, { useEffect } from "react";
import { T } from "./theme.jsx";

const TOAST_DURATION = 4000;
const STYLE_ID = "toast-anim";

if (!document.getElementById(STYLE_ID)) {
  const s = document.createElement("style");
  s.id = STYLE_ID;
  s.textContent = `
@keyframes toastSlideIn {
  from { opacity: 0; transform: translateX(40px); }
  to   { opacity: 1; transform: translateX(0); }
}
@keyframes toastFadeOut {
  from { opacity: 1; transform: translateX(0); }
  to   { opacity: 0; transform: translateX(40px); }
}`;
  document.head.appendChild(s);
}

export default function ToastContainer({ toasts, onDismiss }) {
  if (!toasts || toasts.length === 0) return null;

  return (
    <div style={{
      position: "fixed",
      top: 70,
      right: 16,
      zIndex: 100,
      display: "flex",
      flexDirection: "column",
      gap: 8,
      pointerEvents: "none",
    }}>
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onDismiss={onDismiss} />
      ))}
    </div>
  );
}

function ToastItem({ toast, onDismiss }) {
  useEffect(() => {
    const timer = setTimeout(() => onDismiss(toast.id), TOAST_DURATION);
    return () => clearTimeout(timer);
  }, [toast.id, onDismiss]);

  return (
    <div style={{
      background: `linear-gradient(135deg, ${T.raised}, ${T.surface})`,
      border: `1px solid ${T.gold}66`,
      borderRadius: T.r,
      padding: "10px 14px",
      display: "flex",
      alignItems: "center",
      gap: 10,
      minWidth: 260,
      maxWidth: 340,
      boxShadow: `0 4px 20px rgba(0,0,0,.4), 0 0 30px ${T.gold}22`,
      pointerEvents: "auto",
      animation: "toastSlideIn .3s ease-out",
    }}>
      <span style={{ fontSize: 24 }}>{toast.icon}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontFamily: T.disp, fontWeight: 700, fontSize: 13,
          letterSpacing: .5, textTransform: "uppercase", color: T.gold,
          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
        }}>
          {toast.title}
        </div>
        {toast.desc && (
          <div style={{ fontFamily: T.body, fontSize: 10.5, color: T.txt3, marginTop: 1 }}>
            {toast.desc}
          </div>
        )}
      </div>
    </div>
  );
}
