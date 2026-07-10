// Keyboard shortcuts hook — Space/Ctrl+Z/Ctrl+Y
import { useEffect } from "react";

export function useKeyboard({ advance, dispatch, disabled }) {
  useEffect(() => {
    const handler = (e) => {
      if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;
      if (disabled) return;

      if (e.code === "Space") {
        e.preventDefault();
        advance();
      }
      if (e.ctrlKey && e.code === "KeyZ" && !e.shiftKey) {
        e.preventDefault();
        dispatch({ type: "UNDO" });
      }
      if (e.ctrlKey && e.code === "KeyY") {
        e.preventDefault();
        dispatch({ type: "REDO" });
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [advance, dispatch, disabled]);
}
