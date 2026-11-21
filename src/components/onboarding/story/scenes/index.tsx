// The scene of each story question, built from the app's own pieces with
// example values that hold in all 16 states.

import React from "react";

import type { Question } from "@utils/onboardingStory";

import type { Cue } from "../motion";
import { ExamShareScene } from "./ExamShareScene";
import { ExplainScene } from "./ExplainScene";
import { FocusScene } from "./FocusScene";
import { StatesScene } from "./StatesScene";

export const StoryScene = ({
  question,
  cue,
  compact,
  onReplay,
}: {
  question: Question;
  cue: Cue;
  /** Low screen: scenes that can, show fewer rows. */
  compact: boolean;
  onReplay: () => void;
}) => {
  switch (question) {
    case "explain":
      return <ExplainScene cue={cue} onReplay={onReplay} />;
    case "focus":
      return <FocusScene cue={cue} compact={compact} onReplay={onReplay} />;
    case "examShare":
      return <ExamShareScene cue={cue} compact={compact} onReplay={onReplay} />;
    case "calculatedBefore":
      return <StatesScene cue={cue} onReplay={onReplay} />;
  }
};
