// Welcome: a motion intro in real time, no film. The claim on top, a phone
// that floats in from below with a slight tilt, comes to rest and plays
// four beats of the real app UI (where you stand, what counts, what you
// still need, 16 states); one short line per beat below it, then a calm
// loop. Everything follows light/dark, the accent and the language. The
// buttons are there from the first frame. Reduce Motion: a still
// composition (phone at rest on the first beat).

import React, { useCallback, useEffect, useState } from "react";
import { StyleSheet, Text, View, type LayoutChangeEvent } from "react-native";
import { useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  FadeOut,
  FadeOutUp,
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";

import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg";

import { Button } from "@components/common/Button";
import { FontScale, Type } from "@constants/typography";
import { useTranslation } from "@locales/index";
import { useThemeStore } from "@stores/themeStore";

import { INTRO_BEATS, IntroScreen, type IntroBeat } from "./intro/IntroScreens";
import { PhoneFrame, phoneHeightFor } from "./intro/PhoneFrame";

/** How long each beat stays (the loop runs at the same pace). */
const BEAT_MS = 3200;
/** The first beat starts once the phone has nearly settled. */
const FIRST_BEAT_DELAY = 650;
/** Widest phone relative to the screen width. */
const MAX_PHONE_SHARE = 0.74;
/**
 * The phone may run off the bottom of the stage (it fades out there), but
 * at least this share of it stays visible.
 */
const MIN_VISIBLE = 0.62;
/** Height of the fade at the bottom edge of the stage. */
const FADE = 72;
const MAX_PHONE_WIDTH = 340;

const BEAT_KEYS: Record<IntroBeat, string> = {
  standing: "onboarding.welcome.beats.standing",
  counts: "onboarding.welcome.beats.counts",
  needs: "onboarding.welcome.beats.needs",
  states: "onboarding.welcome.beats.states",
};

interface WelcomeViewProps {
  onStart: () => void;
  onRestore: () => void;
  restoring?: boolean;
}

export const WelcomeView = ({
  onStart,
  onRestore,
  restoring = false,
}: WelcomeViewProps) => {
  const colors = useThemeStore((state) => state.colors);
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const reduceMotion = useReducedMotion();
  const [stage, setStage] = useState({ width: 0, height: 0 });
  // -1: phone still floating in, no beat yet.
  const [beatIndex, setBeatIndex] = useState(reduceMotion ? 0 : -1);
  const [focused, setFocused] = useState(true);

  useFocusEffect(
    useCallback(() => {
      setFocused(true);
      return () => setFocused(false);
    }, []),
  );

  // Entrance: from below, tilted back and turned a little, onto its spot.
  const rise = useSharedValue(reduceMotion ? 0 : 1);
  const bob = useSharedValue(0);
  useEffect(() => {
    if (reduceMotion) return;
    rise.value = withDelay(
      120,
      withSpring(0, { damping: 17, stiffness: 70, mass: 1.1 }),
    );
  }, [reduceMotion, rise]);

  // Calm float while the page is visible.
  useEffect(() => {
    if (reduceMotion || !focused) {
      cancelAnimation(bob);
      return;
    }
    bob.value = withDelay(
      900,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 2600, easing: Easing.inOut(Easing.sin) }),
          withTiming(0, { duration: 2600, easing: Easing.inOut(Easing.sin) }),
        ),
        -1,
      ),
    );
    return () => cancelAnimation(bob);
  }, [bob, focused, reduceMotion]);

  // Beats: start once the phone is in, then loop while visible.
  useEffect(() => {
    if (reduceMotion || !focused) return;
    const timer = setTimeout(
      () => setBeatIndex((index) => (index + 1) % INTRO_BEATS.length),
      beatIndex < 0 ? FIRST_BEAT_DELAY : BEAT_MS,
    );
    return () => clearTimeout(timer);
  }, [beatIndex, focused, reduceMotion]);

  const phoneWidth = Math.floor(
    Math.min(
      stage.width * MAX_PHONE_SHARE,
      MAX_PHONE_WIDTH,
      stage.height / MIN_VISIBLE / (phoneHeightFor(100) / 100),
    ),
  );

  const phoneStyle = useAnimatedStyle(() => ({
    opacity: 1 - rise.value * 0.6,
    transform: [
      { perspective: 900 },
      { translateY: rise.value * stage.height * 0.9 - bob.value * 6 },
      { rotateX: `${rise.value * 24}deg` },
      { rotateZ: `${rise.value * -7 + (bob.value - 0.5) * 0.8}deg` },
      { scale: 1 - rise.value * 0.06 },
    ],
  }));

  const onStage = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setStage({ width, height });
  };

  const beat = beatIndex >= 0 ? INTRO_BEATS[beatIndex] : null;

  return (
    <View
      style={[
        styles.flex,
        { backgroundColor: colors.background, paddingTop: insets.top + 12 },
      ]}
    >
      <Text
        accessibilityRole="header"
        accessibilityLabel={t("onboarding.welcome.claim").replace(/\n/g, " ")}
        maxFontSizeMultiplier={FontScale.heading}
        style={[styles.claim, { color: colors.text }]}
      >
        {t("onboarding.welcome.claim")}
      </Text>

      <View
        style={styles.stage}
        onLayout={onStage}
        accessible
        accessibilityRole="image"
        accessibilityLabel={t("onboarding.welcome.a11y")}
      >
        {phoneWidth > 0 ? (
          <Animated.View style={phoneStyle}>
            <PhoneFrame width={phoneWidth}>
              {beat ? (
                <Animated.View
                  key={`${beat}-${beatIndex}`}
                  style={styles.flex}
                  entering={
                    reduceMotion ? undefined : FadeIn.duration(380).delay(80)
                  }
                  exiting={reduceMotion ? undefined : FadeOut.duration(220)}
                >
                  <IntroScreen beat={beat} animate={!reduceMotion} />
                </Animated.View>
              ) : null}
            </PhoneFrame>
          </Animated.View>
        ) : null}
        <BottomFade color={colors.background} />
      </View>

      <View style={styles.beatLine}>
        {beat && !reduceMotion ? (
          <Animated.Text
            key={beat}
            entering={FadeInDown.duration(420)}
            exiting={FadeOutUp.duration(220)}
            maxFontSizeMultiplier={FontScale.heading}
            accessibilityLiveRegion="polite"
            style={[Type.title3, styles.center, { color: colors.text }]}
          >
            {t(BEAT_KEYS[beat])}
          </Animated.Text>
        ) : null}
      </View>

      <View
        style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) }]}
      >
        <Button
          title={t("onboarding.welcome.start")}
          onPress={onStart}
          disabled={restoring}
          size="large"
          fullWidth
        />
        <Button
          title={t("onboarding.welcome.restore")}
          onPress={onRestore}
          loading={restoring}
          variant="ghost"
          fullWidth
        />
        <Text
          style={[
            Type.footnote,
            styles.center,
            styles.promise,
            { color: colors.textSecondary },
          ]}
        >
          {t("onboarding.welcome.promise")}
        </Text>
      </View>
    </View>
  );
};

/** The page colour fading in over the bottom edge of the stage. */
const BottomFade = ({ color }: { color: string }) => (
  <Svg style={styles.fade} pointerEvents="none">
    <Defs>
      <LinearGradient id="introFade" x1="0" y1="0" x2="0" y2="1">
        <Stop offset="0" stopColor={color} stopOpacity={0} />
        <Stop offset="1" stopColor={color} stopOpacity={1} />
      </LinearGradient>
    </Defs>
    <Rect x="0" y="0" width="100%" height="100%" fill="url(#introFade)" />
  </Svg>
);

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  claim: {
    fontSize: 32,
    lineHeight: 36,
    fontWeight: "800",
    letterSpacing: -0.8,
    textAlign: "center",
    paddingHorizontal: 24,
  },
  stage: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-start",
    paddingTop: 20,
    overflow: "hidden",
  },
  fade: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: FADE,
  },
  beatLine: {
    // Room for two lines, so a longer beat never moves the phone.
    minHeight: 56,
    justifyContent: "center",
    paddingHorizontal: 24,
    marginTop: 4,
  },
  center: {
    textAlign: "center",
  },
  footer: {
    paddingHorizontal: 24,
    paddingTop: 10,
    gap: 2,
  },
  promise: {
    marginTop: 2,
  },
});
