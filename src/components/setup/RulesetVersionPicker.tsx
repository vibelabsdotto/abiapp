// Ruleset versions of one state: "Automatisch" (default for the year) or
// an explicit version (repeaters, cohorts with other rules).

import React, { useMemo } from "react";

import { defaultRulesetFor, rulesetsForState } from "@domain/index";
import type { StateCode } from "@domain/model";
import { Chip, ListRow, Section } from "@components/ui";
import { rulesetVersionLabel } from "@hooks/useRuleset";
import { useTranslation } from "@locales/index";
import { tryDomain } from "@stores/domainAccess";

import { isProvisional } from "./RulesetCard";

interface RulesetVersionPickerProps {
  state: StateCode | null;
  abiturYear: number | null;
  /** Explicit version or null for automatic. */
  value: string | null;
  onChange: (rulesetId: string | null) => void;
}

export const RulesetVersionPicker = ({
  state,
  abiturYear,
  value,
  onChange,
}: RulesetVersionPickerProps) => {
  const { t } = useTranslation();
  const versions = useMemo(
    () => (state ? (tryDomain(() => rulesetsForState(state)).value ?? []) : []),
    [state],
  );
  const automatic = useMemo(
    () =>
      state && abiturYear !== null
        ? tryDomain(() => defaultRulesetFor(state, abiturYear)).value
        : null,
    [state, abiturYear],
  );
  if (!state || versions.length === 0) return null;

  return (
    <Section title={t("setup.version")} info={t("setup.versionFooter")}>
      <ListRow
        title={t("setup.versionAuto")}
        subtitle={
          automatic
            ? t("setup.versionAutoHint", {
                label: rulesetVersionLabel(automatic),
              })
            : undefined
        }
        selected={value === null}
        onPress={() => onChange(null)}
      />
      {versions.map((ruleset) => (
        <ListRow
          key={ruleset.id}
          title={rulesetVersionLabel(ruleset)}
          badges={
            isProvisional(ruleset) ? (
              <Chip label={t("settings.draft")} tone="warning" />
            ) : undefined
          }
          selected={value === ruleset.id}
          onPress={() => onChange(ruleset.id)}
        />
      ))}
    </Section>
  );
};
