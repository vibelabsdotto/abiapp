// The last onboarding step asks "In welchem Fach?" and should land in the
// grade editor. Finishing the onboarding swaps the route tree (Stack.Protected),
// so the subject is handed over here and the overview opens the editor once
// it is mounted. In memory only.

import { create } from "zustand";

interface FirstGradeIntent {
  subjectId: string | null;
  request: (subjectId: string) => void;
  /** Returns the pending subject and clears it. */
  take: () => string | null;
}

export const useFirstGradeIntent = create<FirstGradeIntent>()((set, get) => ({
  subjectId: null,
  request: (subjectId) => set({ subjectId }),
  take: () => {
    const { subjectId } = get();
    if (subjectId !== null) set({ subjectId: null });
    return subjectId;
  },
}));
