// Subject visuals with the profile's ruleset catalog: symbol and colour of
// a subject resolved through subjectVisual() plus the catalog entry's SF
// Symbol and tags. Use the resolver for lists and native menu icons
// (hooks cannot run inside loops); SubjectAvatar uses it internally.

import { useCallback, useMemo } from "react";

import type { CatalogSubject } from "@domain/model";
import { useRuleset } from "@hooks/useRuleset";

import { subjectVisual, type SubjectVisual } from "./subjects";

export interface SubjectLike {
  catalogKey?: string | null;
  name?: string | null;
  tags?: readonly string[];
}

export function useSubjectVisualResolver(): (
  subject: SubjectLike,
) => SubjectVisual {
  const { ruleset } = useRuleset();
  const catalog = useMemo(
    () =>
      new Map<string, CatalogSubject>(
        (ruleset?.catalog ?? []).map((entry) => [entry.key, entry]),
      ),
    [ruleset],
  );
  return useCallback(
    (subject: SubjectLike) => {
      const entry = subject.catalogKey
        ? catalog.get(subject.catalogKey)
        : undefined;
      return subjectVisual(subject.catalogKey, {
        catalogSymbol: entry?.sfSymbol,
        tags: subject.tags?.length ? subject.tags : entry?.tags,
        name: subject.name ?? entry?.name,
      });
    },
    [catalog],
  );
}
