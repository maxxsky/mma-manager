import React from "react";
import { T, Panel, Eyebrow, Btn } from "./theme.jsx";

export default function ConfirmModal({ title, body, onConfirm, onCancel, confirmLabel, danger }) {
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 100, background: "rgba(0,0,0,0.7)",
      display: "flex", alignItems: "center", justifyContent: "center" }}>
      <Panel style={{ maxWidth: 400, width: "90%", textAlign: "center" }}>
        <Eyebrow color={danger ? T.neg : T.gold}>{title}</Eyebrow>
        <div style={{ fontFamily: T.body, fontSize: 13, color: T.txt2, marginBottom: 20, lineHeight: 1.5 }}>{body}</div>
        <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
          <Btn color={danger ? T.neg : T.ember} onClick={onConfirm}>{confirmLabel || "Confirm"}</Btn>
          <Btn ghost color={T.txt3} onClick={onCancel}>Cancel</Btn>
        </div>
      </Panel>
    </div>
  );
}
