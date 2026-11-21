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
  onReplay,
}: {
  question: Question;
  cue: Cue;
  onReplay: () => void;
}) => {
  switch (question) {
    case "explain":
      return <ExplainScene cue={cue} onReplay={onReplay} />;
    case "focus":
      return <FocusScene cue={cue} onReplay={onReplay} />;
    case "examShare":
      return <ExamShareScene cue={cue} onReplay={onReplay} />;
    case "calculatedBefore":
      return <StatesScene cue={cue} onReplay={onReplay} />;
  }
};
