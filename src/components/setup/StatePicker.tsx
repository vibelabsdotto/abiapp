// The 16 states as an inset-grouped single-choice list.

import React, { useMemo } from "react";

import { listStates } from "@domain/index";
import type { StateCode } from "@domain/model";
import { ListRow, Section } from "@components/ui";

import { CodeBadge } from "./SetupParts";

interface StatePickerProps {
  value: StateCode | null;
  onChange: (state: StateCode) => void;
  title?: string;
}

export const StatePicker = ({ value, onChange, title }: StatePickerProps) => {
  const states = useMemo(() => listStates(), []);
  return (
    <Section title={title} separatorInset={60}>
      {states.map((state) => {
        const selected = state.code === value;
        return (
          <ListRow
            key={state.code}
            title={state.name}
            leading={<CodeBadge label={state.code} />}
            selected={selected}
            onPress={() => onChange(state.code)}
          />
        );
      })}
    </Section>
  );
};
