import React, { createContext, useContext, useState, useEffect } from "react";
import { t as rawT, setLang } from "../i18n/index.js";

const LangContext = createContext();

export function LangProvider({ children }) {
  const [lang, setLangState] = useState(() => { setLang("id"); return "id"; });
  // Keep <html lang> in step with the UI language (screen readers, hyphenation).
  useEffect(() => { document.documentElement.lang = lang; }, [lang]);

  const changeLang = (l) => {
    setLang(l);
    setLangState(l);
  };

  const tt = (key) => rawT(key, lang);

  return (
    <LangContext.Provider value={{ t: tt, lang, setLang: changeLang }}>
      {children}
    </LangContext.Provider>
  );
}

export function useLang() {
  return useContext(LangContext);
}
