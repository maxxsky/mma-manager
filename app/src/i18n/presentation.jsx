import React from "react";
import { localizeText } from "./text.js";

// Translate visible strings at the existing UI primitive boundary. Never touch
// game objects, IDs, option values, handlers, or saved narrative text.
export function localizeTree(node) {
  if (typeof node === "string") return localizeText(node);
  if (Array.isArray(node)) return node.map(localizeTree);
  if (!React.isValidElement(node)) return node;
  const props = {};
  for (const key of ["label", "title", "detail", "hint", "placeholder", "aria-label"]) {
    if (typeof node.props[key] === "string") props[key] = localizeText(node.props[key]);
  }
  if (node.props.children !== undefined) props.children = localizeTree(node.props.children);
  return Object.keys(props).length ? React.cloneElement(node, props) : node;
}
