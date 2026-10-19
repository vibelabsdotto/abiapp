// Abitur years 2027–2030 plus "2031 oder später".

import React from "react";

import { ListRow, Section } from "@components/ui";
import { ABITUR_YEARS, LATEST_ABITUR_YEAR } from "@hooks/useSetupDraft";
import { useTranslation } from "@locales/index";

interface YearPickerProps {
  value: number | null;
  onChange: (year: number) => void;
  title?: string;
  footer?: string;
}

export const YearPicker = ({
  value,
  onChange,
  title,
  footer,
}: YearPickerProps) => {
  const { t } = useTranslation();
  // Years after the list map onto the last entry ("oder später").
  const selectedYear =
    value !== null && value > LATEST_ABITUR_YEAR ? LATEST_ABITUR_YEAR : value;
  return (
    <Section title={title} footer={footer}>
      {ABITUR_YEARS.map((year) => {
        const label =
          year === LATEST_ABITUR_YEAR
            ? t("setup.yearLater", { year })
            : String(year);
        const selected = selectedYear === year;
        return (
          <ListRow
            key={year}
            title={label}
            selected={selected}
            onPress={() => onChange(year)}
          />
        );
      })}
    </Section>
  );
};
