// Localization entry point: `t` for plain calls, `useTranslation` for
// components that must re-render when the language changes.

import i18n from "./i18n";
import { useLanguageStore } from "@stores/languageStore";
import type { LanguageCode } from "@apptypes/enums";

export type { Translations } from "./de";
export type { LanguageCode };

/** Translate a dot-notation key, e.g. `t("settings.title")`. */
export const t = (
  key: string,
  params?: Record<string, string | number>,
): string => i18n.t(key, params);

export const locale = (): LanguageCode => i18n.locale as LanguageCode;

/** Reactive translations: re-renders on language changes. */
export const useTranslation = () => {
  const refreshKey = useLanguageStore((state) => state.refreshKey);
  const currentLanguage = useLanguageStore((state) => state.currentLanguage);

  return { t, locale: currentLanguage, refreshKey };
};
