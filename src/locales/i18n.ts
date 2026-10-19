// i18n instance (i18n-js + expo-localization). German is the default and
// fallback locale; the language store switches it at runtime.

import { I18n } from "i18n-js";
import { getLocales } from "expo-localization";

import { de } from "./de";
import { en } from "./en";

const i18n = new I18n({ de, en });

i18n.defaultLocale = "de";
i18n.enableFallback = true;
i18n.locale = getLocales()[0]?.languageCode === "en" ? "en" : "de";

export default i18n;
