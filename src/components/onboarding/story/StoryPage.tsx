// One story question and the scene that answers it, on one page that
// changes in place, so the chosen answer can physically become the head
// of the scene:
//
// 1. Tap: the card fills with the accent (touch-down already presses it),
//    the question and the other answers tip back and fade, one after the
//    other, like cards falling away.
// 2. Hold, then the filled card travels to the top and shrinks into the
//    label "Du: Keine Ahnung" (one frame with two faces: a single view owns
//    position, size and corners, the card text and the label text only
//    crossfade inside it). Corners keep their roundness as a share of the
//    short side, so the card's soft corners open into the pill's round ends.
// 3. The headline that answers the answer, the scene and its text arrive
//    under it; the progress bar slides on; "Weiter" fades in and works at
//    once. The scene plays when the label has landed, then stands still;
//    tapping it plays it again.
//
// Back (header, Android back) is its own move on the same clock: the scene
// gives way, the label grows back into the filled card, the question and
// the other answers rise into place. Reduce Motion: the layers swap with a
// short fade, scenes stand in their last frame.

import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
  type LayoutRectangle,
} from "react-native";
import { useFocusEffect } from "expo-router";
import Animated, {
  Easing,
  useAnimatedStyle,
  useDerivedValue,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
  type SharedValue,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";

import { useInPlaceBack } from "@components/common/feedback";
import { useStepProgress } from "@components/onboarding/steps";
import { OnboardingStep } from "@components/setup";
import { Radius, Type } from "@constants/typography";
import { useTranslation } from "@locales/index";
import { useOnboardingStory } from "@stores/onboardingStory";
import { useThemeStore } from "@stores/themeStore";
import {
  QUESTIONS,
  sceneHeadline,
  type Answer,
  type Question,
} from "@utils/onboardingStory";

import { AnswerCard, AnswerFace, FILL_MS } from "./AnswerCard";
import { EASE_OUT, TRANSFORM_MS, easeOut, span } from "./motion";
import { StoryHeading } from "./StoryHeading";
import { StoryScene } from "./scenes";

type Phase = "question" | "forward" | "scene" | "back";

/** The filled card holds this long before it travels. */
const HOLD_MS = 190;
/** The question layer leaves (and returns) on one clock, cascaded. */
const LEAVE_MS = 460;
/** The scene layer arrives on one clock, cascaded. */
const ENTER_MS = 780;
const ENTER_DELAY = 200;
/** Share of the clock between two cascaded elements. */
const LEAVE_STAGGER = 0.09;
const ENTER_STAGGER = 0.16;

type Rect = Pick<LayoutRectangle, "x" | "y" | "width" | "height">;
const NO_RECT: Rect = { x: 0, y: 0, width: 0, height: 0 };

interface StoryPageProps {
  question: Question;
  /** Footer button of the scene ("Weiter", on the last "Mein Bundesland wählen"). */
  continueLabel: string;
  onContinue: () => void;
  /** "Überspringen"; omitted on the last scene. */
  onSkip?: (at: "question" | "scene") => void;
}

export const StoryPage = ({
  question,
  continueLabel,
  onContinue,
  onSkip,
}: StoryPageProps) => {
  const { t } = useTranslation();
  const colors = useThemeStore((state) => state.colors);
  const reduce = useReducedMotion();
  const chosen = useOnboardingStory((state) => state.answers[question]) as
    Answer | undefined;
  const choose = useOnboardingStory((state) => state.answer);
  const resume = useOnboardingStory((state) => state.resume);
  const [phase, setPhase] = useState<Phase>("question");
  const [play, setPlay] = useState(0);
  const [heights, setHeights] = useState({ question: 0, scene: 0 });
  const [labelRect, setLabelRect] = useState<Rect>(NO_RECT);
  const [cardWidth, setCardWidth] = useState(0);
  const listY = useRef(0);
  const cards = useRef<Partial<Record<Answer, Rect>>>({});
  const label = useRef<Rect>(NO_RECT);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const progress = useStepProgress({
    kind: phase === "scene" ? "scene" : "question",
    question,
  });

  // 0 = question in place, 1 = gone. Arrives from 1 on the first frame.
  const leave = useSharedValue(reduce ? 0 : 1);
  // 0 = scene hidden, 1 = in place.
  const enter = useSharedValue(0);
  // The hand-off frame: geometry 0 (card) .. 1 (label), and visibility.
  const morph = useSharedValue(0);
  const frame = useSharedValue(0);
  const labelShown = useSharedValue(0);
  // The chosen card is away while the frame or the label carries it.
  const carried = useDerivedValue(() =>
    Math.max(frame.value, labelShown.value),
  );
  const from = useSharedValue<Rect>(NO_RECT);
  const to = useSharedValue<Rect>(NO_RECT);

  useEffect(() => {
    if (!reduce) {
      leave.set(
        withDelay(
          60,
          withTiming(0, { duration: LEAVE_MS + 120, easing: Easing.linear }),
        ),
      );
    }
    const pending = timers.current;
    return () => pending.forEach(clearTimeout);
  }, [leave, reduce]);

  useFocusEffect(
    useCallback(() => {
      resume();
    }, [resume]),
  );

  const startScene = useCallback(() => {
    setPlay((value) => value + 1);
  }, []);

  const finishBack = useCallback(() => setPhase("question"), []);

  const pick = (answer: Answer) => {
    if (phase !== "question") return;
    choose(question, answer);
    setPhase("forward");
    const card = cards.current[answer];
    if (card) setCardWidth(card.width);
    leave.set(
      reduce
        ? withTiming(1, { duration: 200 })
        : withTiming(1, { duration: LEAVE_MS, easing: Easing.linear }),
    );

    timers.current.push(
      setTimeout(
        () => {
          const target = label.current;
          setPhase("scene");
          if (reduce || !card || target.width === 0) {
            labelShown.set(withTiming(1, { duration: 240 }));
            enter.set(withTiming(1, { duration: reduce ? 240 : ENTER_MS }));
            startScene();
            return;
          }
          from.set(card);
          to.set(target);
          morph.set(0);
          frame.set(1);
          morph.set(
            withSpring(
              1,
              { duration: TRANSFORM_MS, dampingRatio: 1 },
              (finished) => {
                if (!finished) return;
                // Hand-over on one frame: the label appears, the frame goes.
                labelShown.value = 1;
                frame.value = 0;
                scheduleOnRN(startScene);
              },
            ),
          );
          enter.set(
            withDelay(
              ENTER_DELAY,
              withTiming(1, { duration: ENTER_MS, easing: Easing.linear }),
            ),
          );
        },
        reduce ? 200 : FILL_MS + HOLD_MS,
      ),
    );
  };

  const back = () => {
    if (phase !== "scene") return;
    setPhase("back");
    const card = chosen ? cards.current[chosen] : undefined;
    const target = label.current;
    enter.set(withTiming(0, { duration: 220, easing: EASE_OUT }));
    if (reduce || !card || target.width === 0) {
      labelShown.set(withTiming(0, { duration: 200 }));
      leave.set(
        withTiming(0, { duration: 240 }, (finished) => {
          if (finished) scheduleOnRN(finishBack);
        }),
      );
      return;
    }
    setCardWidth(card.width);
    from.set(card);
    to.set(target);
    morph.set(1);
    frame.set(1);
    labelShown.set(0);
    morph.set(
      withSpring(0, { duration: TRANSFORM_MS, dampingRatio: 1 }, (finished) => {
        if (!finished) return;
        frame.value = 0;
        scheduleOnRN(finishBack);
      }),
    );
    leave.set(
      withDelay(
        160,
        withTiming(0, { duration: LEAVE_MS, easing: Easing.linear }),
      ),
    );
  };

  // Back from the scene returns to the question on this page.
  useInPlaceBack(phase !== "question", () => {
    if (phase === "scene") back();
  });

  const answers = QUESTIONS[question] as readonly Answer[];
  const headline = chosen
    ? t(
        `onboarding.story.${question}.headline.${sceneHeadline(question, chosen)}`,
      )
    : "";
  const answerText = (answer: Answer) =>
    t(`onboarding.story.${question}.answers.${answer}`);

  let cascade = 1;
  const order = answers.map((answer) =>
    answer === chosen && phase !== "question" ? 0 : cascade++,
  );

  const frameStyle = useAnimatedStyle(() => {
    const a = from.value;
    const b = to.value;
    const m = morph.value;
    const width = a.width + (b.width - a.width) * m;
    const height = a.height + (b.height - a.height) * m;
    // Roundness as a share of the short side: card 16 pt → pill ends.
    const startRound = Radius.card / Math.max(1, Math.min(a.width, a.height));
    const round = startRound + (0.5 - startRound) * m;
    return {
      opacity: frame.value,
      width,
      height,
      borderRadius: round * Math.min(width, height),
      transform: [
        { translateX: a.x + (b.x - a.x) * m },
        { translateY: a.y + (b.y - a.y) * m },
      ],
    };
  });
  const cardFaceStyle = useAnimatedStyle(() => ({
    opacity: 1 - span(morph.value, 0.18, 0.55),
  }));
  const labelFaceStyle = useAnimatedStyle(() => {
    const width =
      from.value.width + (to.value.width - from.value.width) * morph.value;
    return {
      opacity: span(morph.value, 0.42, 0.8),
      transform: [{ translateX: (width - to.value.width) / 2 }],
    };
  });
  const labelStyle = useAnimatedStyle(() => ({ opacity: labelShown.value }));

  const onLabelLayout = (event: LayoutChangeEvent) => {
    const { x, y, width, height } = event.nativeEvent.layout;
    label.current = { x, y, width, height };
    setLabelRect(label.current);
  };

  const sceneVisible = phase === "scene" || phase === "back";

  return (
    <OnboardingStep
      title=""
      {...progress}
      inPlace
      primary={
        phase === "scene"
          ? { title: continueLabel, onPress: onContinue }
          : undefined
      }
      secondary={
        onSkip && phase !== "back"
          ? {
              title: t("onboarding.skip"),
              onPress: () =>
                onSkip(phase === "question" ? "question" : "scene"),
            }
          : undefined
      }
    >
      <View
        style={{ height: Math.max(heights.question, heights.scene) }}
        accessibilityLiveRegion="polite"
      >
        {/* Question */}
        <View
          style={styles.layer}
          pointerEvents={phase === "question" ? "auto" : "none"}
          accessibilityElementsHidden={sceneVisible}
          importantForAccessibility={
            sceneVisible ? "no-hide-descendants" : "auto"
          }
          onLayout={(event) => {
            const height = event.nativeEvent.layout.height;
            setHeights((value) => ({ ...value, question: height }));
          }}
        >
          <Leaving leave={leave} index={0} reduce={reduce} lift>
            <StoryHeading title={t(`onboarding.story.${question}.question`)} />
          </Leaving>
          <View
            style={styles.answers}
            onLayout={(event) => {
              listY.current = event.nativeEvent.layout.y;
            }}
          >
            {answers.map((answer, index) => (
              <Leaving
                key={answer}
                leave={leave}
                index={order[index]}
                reduce={reduce}
                hidden={answer === chosen ? carried : undefined}
              >
                <AnswerCard
                  title={answerText(answer)}
                  selected={answer === chosen}
                  disabled={phase !== "question"}
                  onPress={() => pick(answer)}
                  onLayout={(event) => {
                    const { x, y, width, height } = event.nativeEvent.layout;
                    cards.current[answer] = {
                      x,
                      y: listY.current + y,
                      width,
                      height,
                    };
                  }}
                />
              </Leaving>
            ))}
          </View>
        </View>

        {/* Scene */}
        <View
          style={styles.layer}
          pointerEvents={phase === "scene" ? "box-none" : "none"}
          accessibilityElementsHidden={!sceneVisible}
          importantForAccessibility={
            sceneVisible ? "auto" : "no-hide-descendants"
          }
          onLayout={(event) => {
            const height = event.nativeEvent.layout.height;
            setHeights((value) => ({ ...value, scene: height }));
          }}
        >
          <Animated.View
            onLayout={onLabelLayout}
            style={[
              styles.label,
              { backgroundColor: colors.accent },
              labelStyle,
            ]}
          >
            <Text
              numberOfLines={2}
              style={[styles.labelText, { color: colors.accentForeground }]}
            >
              {t("onboarding.story.you", {
                answer: chosen ? answerText(chosen) : "",
              })}
            </Text>
          </Animated.View>
          <Entering enter={enter} index={0} reduce={reduce}>
            <StoryHeading title={headline} />
          </Entering>
          <Entering enter={enter} index={1} reduce={reduce}>
            <StoryScene
              question={question}
              cue={{ play, reduce }}
              onReplay={() => {
                if (phase === "scene") startScene();
              }}
            />
          </Entering>
          <Entering enter={enter} index={2} reduce={reduce}>
            <Text style={[Type.body, styles.text, { color: colors.text }]}>
              {t(`onboarding.story.${question}.text`)}
            </Text>
          </Entering>
        </View>

        {/* The hand-off frame: one geometry, two faces. */}
        <Animated.View
          pointerEvents="none"
          style={[styles.frame, { backgroundColor: colors.accent }, frameStyle]}
        >
          <Animated.View style={[StyleSheet.absoluteFill, cardFaceStyle]}>
            {chosen && cardWidth > 0 ? (
              <AnswerFace
                title={answerText(chosen)}
                width={cardWidth}
                color={colors.accentForeground}
              />
            ) : null}
          </Animated.View>
          <Animated.View
            style={[
              styles.labelFace,
              { width: labelRect.width },
              labelFaceStyle,
            ]}
          >
            <Text
              numberOfLines={2}
              style={[styles.labelText, { color: colors.accentForeground }]}
            >
              {t("onboarding.story.you", {
                answer: chosen ? answerText(chosen) : "",
              })}
            </Text>
          </Animated.View>
        </Animated.View>
      </View>
    </OnboardingStep>
  );
};

/**
 * A question element that tips back and fades as the page leaves (index
 * 0 stays: the chosen card travels instead). `lift` moves it up instead
 * (the question floats away above the answers).
 */
const Leaving = ({
  leave,
  index,
  reduce,
  lift = false,
  hidden,
  children,
}: {
  leave: SharedValue<number>;
  index: number;
  reduce: boolean;
  lift?: boolean;
  /** While the frame or the label carries this element, it is hidden. */
  hidden?: SharedValue<number>;
  children: React.ReactNode;
}) => {
  const style = useAnimatedStyle(() => {
    const start = index * LEAVE_STAGGER;
    const local =
      index === 0 && !lift ? 0 : span(leave.value, start, start + 0.55);
    const p = easeOut(local);
    const motion = reduce ? 0 : 1;
    return {
      opacity: (1 - p) * (hidden ? 1 - hidden.value : 1),
      transform: [
        { perspective: 900 },
        { translateY: motion * (lift ? -16 * p : 10 * p) },
        { rotateX: `${motion * (lift ? 0 : 18 * p)}deg` },
        { scale: 1 - motion * 0.04 * p },
      ],
    };
  });
  return (
    <Animated.View style={[lift ? null : styles.tipping, style]}>
      {children}
    </Animated.View>
  );
};

/** A scene element that rises into place, cascaded after the label. */
const Entering = ({
  enter,
  index,
  reduce,
  children,
}: {
  enter: SharedValue<number>;
  index: number;
  reduce: boolean;
  children: React.ReactNode;
}) => {
  const style = useAnimatedStyle(() => {
    const start = index * ENTER_STAGGER;
    const p = easeOut(span(enter.value, start, start + 0.6));
    return {
      opacity: p,
      transform: [{ translateY: reduce ? 0 : 14 * (1 - p) }],
    };
  });
  return <Animated.View style={style}>{children}</Animated.View>;
};

const styles = StyleSheet.create({
  layer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    gap: 20,
  },
  answers: {
    gap: 10,
  },
  label: {
    alignSelf: "flex-start",
    minHeight: 32,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    justifyContent: "center",
    marginLeft: 4,
  },
  labelText: {
    ...Type.subhead,
    fontWeight: "600",
  },
  labelFace: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    paddingHorizontal: 12,
    justifyContent: "center",
  },
  frame: {
    position: "absolute",
    left: 0,
    top: 0,
    overflow: "hidden",
    borderCurve: "continuous",
  },
  tipping: {
    // Answers tip back about their bottom edge, like cards falling away.
    transformOrigin: "center bottom",
  },
  text: {
    paddingHorizontal: 4,
  },
});
