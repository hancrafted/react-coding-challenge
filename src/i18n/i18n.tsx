import i18n from "i18next";
import { cloneDeep } from "lodash";
import { initReactI18next } from "react-i18next";
import de from "./locales/de.json";
import en from "./locales/en.json";

export const FALLBACK_LANGUAGE = "en";
export const LANGUAGE_STORAGE_KEY = "app.language";

export interface Language {
  locale: string;
  name: string;
  icon: JSX.Element;
}

const getBrowserLanguage = () => {
  const userLang =
    navigator.language ||
    (navigator as Navigator & { userLanguage?: string }).userLanguage;

  return userLang ? userLang.split("-")[0] : FALLBACK_LANGUAGE;
};

const getPersistedLanguage = (): string | null => {
  try {
    if (typeof window === "undefined") return null;
    return window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
  } catch {
    return null;
  }
};

const browserLanguage = getBrowserLanguage();
const persistedLang = getPersistedLanguage();

export const defaultTranslationModules = [
  { locale: "de", texts: de },
  { locale: "en", texts: en }
];
export const defaultLanguages = defaultTranslationModules.map((m) => m.locale);

const resources = cloneDeep(
  Object.fromEntries(
    defaultTranslationModules.map((m) => [m.locale, { app: m.texts }])
  )
);

i18n
  // pass the i18n instance to react-i18next.
  .use(initReactI18next)

  // init i18next
  // for all options read: https://www.i18next.com/overview/configuration-options
  .init({
    resources,
    ns: ["common", "app"],
    defaultNS: "app",
    lng: persistedLang ?? browserLanguage ?? FALLBACK_LANGUAGE,
    fallbackLng: FALLBACK_LANGUAGE,
    interpolation: {
      escapeValue: false // not needed for react as it escapes by default
    }
  });

export default i18n;
