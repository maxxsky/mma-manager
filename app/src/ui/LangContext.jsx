import React, { createContext, useContext, useState, useEffect } from "react";
import { t as rawT, getLang, setLang } from "../engine/i18n.js";

const LangContext = createContext();

export function LangProvider({ children }) {
  const [lang, setLangState] = useState(getLang());

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
