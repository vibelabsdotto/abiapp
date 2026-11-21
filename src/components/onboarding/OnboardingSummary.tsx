// Summary of the saved setup on the last onboarding step: state, year with
// rules version, number of subjects (elevated ones named) and exam subjects.

import React, { useMemo } from "react";

import {
  ProvisionalBanner,
  compactName,
  elevatedPlural,
} from "@components/setup";
import { IssueBanner, ListRow, Section } from "@components/ui";
import { useRuleset } from "@hooks/useRuleset";
import { useTranslation } from "@locales/index";
import { useCourseStore } from "@stores/courseStore";
import { componentNeedsSubject } from "@stores/domainAccess";
import { useProfileStore } from "@stores/profileStore";

const SLOT_ORDER = ["P1", "P2", "P3", "P4", "P5"];

export const OnboardingSummary = () => {
  const { t, locale } = useTranslation();
  const profile = useProfileStore((state) => state.profile);
  const subjects = useCourseStore((state) => state.subjects);
  const { ruleset } = useRuleset();

  const variant = useMemo(
    () =>
      ruleset?.examVariants.find(
        (item) => item.id === profile?.examVariantId,
      ) ?? null,
    [profile, ruleset],
  );
  const required = variant?.components.filter(componentNeedsSubject) ?? [];
  const exams = subjects
    .filter((subject) => subject.examSlot)
    .sort(
      (a, b) =>
        SLOT_ORDER.indexOf(a.examSlot ?? "") -
        SLOT_ORDER.indexOf(b.examSlot ?? ""),
    );
  const examsOpen = required.length === 0 || exams.length < required.length;
  const elevated = subjects.filter((subject) => subject.level === "elevated");

  if (!profile || !ruleset) return null;

  return (
    <>
      <Section title={t("onboarding.done.summary")}>
        <ListRow
          title={t("settings.state")}
          value={ruleset.stateName}
          valueMaxWidth="62%"
        />
        <ListRow
          title={t("settings.abiturYear")}
          subtitle={ruleset.label}
          value={String(profile.abiturYear)}
        />
        <ListRow
          title={t("onboarding.done.subjects")}
          subtitle={
            elevated.length > 0
              ? t("onboarding.done.elevated", {
                  name: elevatedPlural(ruleset, locale),
                  subjects: elevated
                    .map((subject) => compactName(subject))
                    .join(", "),
                })
              : undefined
          }
          value={String(subjects.length)}
        />
        <ListRow
          title={t("settings.exams")}
          subtitle={
            exams.length > 0
              ? exams
                  .map(
                    (subject) => `${subject.examSlot} ${compactName(subject)}`,
                  )
                  .join(", ")
              : undefined
          }
          value={t("settings.examsCount", {
            count: exams.length,
            total: required.length,
          })}
        />
      </Section>
      {examsOpen ? (
        <IssueBanner
          severity="info"
          message={t("onboarding.done.examsLater")}
        />
      ) : null}
      <ProvisionalBanner ruleset={ruleset} />
    </>
  );
};
