import { getLang, INTERFACE_TEXT_ID } from "./index.js";
import { MESSAGE_PAIRS } from "./messages-id.js";

const exact = new Map([...INTERFACE_TEXT_ID, ...MESSAGE_PAIRS.filter(([key]) => !/\{\d+\}/.test(key))]);
const escape = value => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const patterns = MESSAGE_PAIRS.filter(([key]) => /\{\d+\}/.test(key)).map(([key, translation]) => {
  const ids = [];
  const regex = key.split(/(\{\d+\})/).map(part => {
    if (!/^\{\d+\}$/.test(part)) return escape(part);
    ids.push(Number(part.slice(1, -1))); return "([\\s\\S]*?)";
  }).join("");
  return { regex: new RegExp(`^${regex}$`), ids, translation };
});
const cache = new Map();

function translate(value, depth = 0) {
  if (!value || depth > 6) return value;
  const trimmed = value.trim();
  const leading = value.slice(0, value.indexOf(trimmed));
  const trailing = value.slice(value.indexOf(trimmed) + trimmed.length);
  if (exact.has(trimmed)) return leading + exact.get(trimmed) + trailing;
  const timestamp = trimmed.match(/^(\[\d+:\d{2}\]\s*)([\s\S]*)$/);
  if (timestamp) return leading + timestamp[1] + translate(timestamp[2], depth + 1) + trailing;
  for (const rule of patterns) {
    const match = trimmed.match(rule.regex);
    if (!match) continue;
    const args = {};
    rule.ids.forEach((id, i) => { args[id] = match[i + 1]; });
    return leading + rule.translation.replace(/\{(\d+)\}/g, (_, id) => args[id] ?? "") + trailing;
  }
  // Narratives can join several complete sentences or paragraphs from templates.
  const parts = value.split(/(\n+|(?<=[.!?])\s+)/);
  return parts.length > 1 ? parts.map(part => translate(part, depth + 1)).join("") : value;
}

export function localizeText(value, lang = getLang()) {
  if (typeof value !== "string" || lang !== "id") return value;
  if (cache.has(value)) return cache.get(value);
  const translated = translate(value);
  if (cache.size >= 3000) cache.clear();
  cache.set(value, translated);
  return translated;
}
