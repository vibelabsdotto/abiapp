// Welcome: a motion intro in real time, no film. The claim on top; a phone
// floats in from below (tilted about 8° around the vertical axis and 4°
// back), settles on a spring and never stands still (a calm float). Per
// beat the camera moves in on what the beat is about (the arch, the
// courses that count, the points the next exam needs, the 16 states) while
// the content animates. Below the stage one line per beat with four dots,
// then a calm loop. Everything follows light/dark, the accent and the
// language. The buttons are there from the first frame. Reduce Motion: a
// still composition (whole phone at rest on the first beat).

import React, { useCallback, useEffect, useRef, useState } from "react";
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

import {
  BEAT_MS,
  CAMERA,
  INTRO_BEATS,
  IntroScreen,
  type AnchorMap,
  type IntroBeat,
} from "./intro/IntroScreens";
import { PhoneFrame, phoneGeometry } from "./intro/PhoneFrame";

/** Natural phone width relative to the stage width, and its cap. */
const PHONE_SHARE = 0.66;
const MAX_PHONE_WIDTH = 330;
/** Height of the fades at the stage edges. */
const FADE = 48;
const CAMERA_MS = 750;
const CAMERA_EASING = Easing.bezier(0.45, 0, 0.2, 1);

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
  const [beatIndex, setBeatIndex] = useState(0);
  const [focused, setFocused] = useState(true);
  const anchors = useRef<AnchorMap>({});
  const placed = useRef(false);

  useFocusEffect(
    useCallback(() => {
      setFocused(true);
      return () => setFocused(false);
    }, []),
  );

  const ready = stage.width > 0;
  const geometry = phoneGeometry(
    Math.floor(Math.min(stage.width * PHONE_SHARE, MAX_PHONE_WIDTH)),
  );
  /** Zoom that shows the whole phone (entrance, loop start, Reduce Motion). */
  const fitZoom = ready
    ? Math.min(1, (stage.height * 0.94) / geometry.height)
    : 1;

  const enter = useSharedValue(reduceMotion ? 0 : 1);
  const zoom = useSharedValue(fitZoom);
  const shift = useSharedValue(0);
  const bob = useSharedValue(0);

  // Entrance once the stage is measured: from below the stage, tilted, onto
  // its spot on a spring (about 0.9 s).
  useEffect(() => {
    if (!ready || reduceMotion) return;
    enter.value = withDelay(
      120,
      withSpring(0, { damping: 15, stiffness: 95, mass: 1 }),
    );
  }, [enter, ready, reduceMotion]);

  // A calm float while the page is visible.
  useEffect(() => {
    if (reduceMotion || !focused) {
      cancelAnimation(bob);
      return;
    }
    bob.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 2400, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 2400, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
    );
    return () => cancelAnimation(bob);
  }, [bob, focused, reduceMotion]);

  const beat = INTRO_BEATS[beatIndex];

  // Camera: per beat, keyframes onto anchors of its screen. The loop starts
  // from the whole phone again.
  useEffect(() => {
    if (!ready) return;
    if (reduceMotion || !focused) {
      zoom.value = fitZoom;
      shift.value = 0;
      return;
    }
    const moveTo = (nextZoom: number, nextShift: number) => {
      zoom.value = withTiming(nextZoom, {
        duration: CAMERA_MS,
        easing: CAMERA_EASING,
      });
      shift.value = withTiming(nextShift, {
        duration: CAMERA_MS,
        easing: CAMERA_EASING,
      });
    };
    if (!placed.current) {
      // First frame: the whole phone, no camera move during the entrance.
      placed.current = true;
      zoom.value = fitZoom;
      shift.value = 0;
    } else if (beatIndex === 0) {
      moveTo(fitZoom, 0);
    }
    const timers = CAMERA[beat].map((key) =>
      setTimeout(
        () => {
          const anchor = anchors.current[`${beat}.${key.anchor}`];
          if (!anchor) return;
          const centre =
            geometry.frame +
            (anchor.y + anchor.height / 2) * geometry.contentScale;
          moveTo(key.zoom, -key.zoom * (centre - geometry.height / 2));
        },
        // Anchors report on the first layout pass of the beat's screen.
        Math.max(key.at, 60),
      ),
    );
    timers.push(
      setTimeout(
        () => setBeatIndex((index) => (index + 1) % INTRO_BEATS.length),
        BEAT_MS[beat],
      ),
    );
    return () => timers.forEach(clearTimeout);
  }, [
    beat,
    beatIndex,
    fitZoom,
    focused,
    geometry.contentScale,
    geometry.frame,
    geometry.height,
    ready,
    reduceMotion,
    shift,
    zoom,
  ]);

  const onAnchor = useCallback(
    (name: string, y: number, height: number) => {
      anchors.current[`${beat}.${name}`] = { y, height };
    },
    [beat],
  );

  const phoneStyle = useAnimatedStyle(() => ({
    transform: [
      { perspective: 1000 },
      {
        translateY:
          enter.value * stage.height * 1.05 + shift.value - bob.value * 4,
      },
      { rotateY: `${enter.value * 8 + (bob.value - 0.5) * 1.2}deg` },
      { rotateX: `${enter.value * 4 + (bob.value - 0.5) * 0.6}deg` },
      { scale: zoom.value },
    ],
  }));

  const onStage = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setStage({ width, height });
  };

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
        {ready ? (
          <Animated.View
            style={[
              styles.phone,
              {
                left: (stage.width - geometry.width) / 2,
                top: (stage.height - geometry.height) / 2,
              },
              phoneStyle,
            ]}
          >
            <PhoneFrame geometry={geometry}>
              <Animated.View
                key={`${beat}-${beatIndex}`}
                style={styles.flex}
                entering={
                  reduceMotion ? undefined : FadeIn.duration(320).delay(60)
                }
                exiting={reduceMotion ? undefined : FadeOut.duration(200)}
              >
                <IntroScreen
                  beat={beat}
                  animate={!reduceMotion}
                  onAnchor={onAnchor}
                />
              </Animated.View>
            </PhoneFrame>
          </Animated.View>
        ) : null}
        <EdgeFade color={colors.background} edge="top" />
        <EdgeFade color={colors.background} edge="bottom" />
      </View>

      {reduceMotion ? null : (
        <View style={styles.beatArea}>
          <View style={styles.beatLine}>
            <Animated.Text
              key={beat}
              entering={FadeInDown.duration(420)}
              exiting={FadeOutUp.duration(220)}
              maxFontSizeMultiplier={FontScale.heading}
              accessibilityLiveRegion="polite"
              style={[Type.title2, styles.center, { color: colors.text }]}
            >
              {t(BEAT_KEYS[beat])}
            </Animated.Text>
          </View>
          <View style={styles.dots} importantForAccessibility="no">
            {INTRO_BEATS.map((item, index) => (
              <View
                key={item}
                style={[
                  styles.dot,
                  index === beatIndex && styles.dotActive,
                  {
                    backgroundColor:
                      index === beatIndex ? colors.accent : colors.separator,
                  },
                ]}
              />
            ))}
          </View>
        </View>
      )}

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

/** The page colour fading in over one edge of the stage. */
const EdgeFade = ({
  color,
  edge,
}: {
  color: string;
  edge: "top" | "bottom";
}) => {
  const id = `introFade-${edge}`;
  return (
    <Svg
      style={[styles.fade, edge === "top" ? styles.fadeTop : styles.fadeBottom]}
      pointerEvents="none"
    >
      <Defs>
        <LinearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <Stop
            offset="0"
            stopColor={color}
            stopOpacity={edge === "top" ? 1 : 0}
          />
          <Stop
            offset="1"
            stopColor={color}
            stopOpacity={edge === "top" ? 0 : 1}
          />
        </LinearGradient>
      </Defs>
      <Rect x="0" y="0" width="100%" height="100%" fill={`url(#${id})`} />
    </Svg>
  );
};

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
    marginTop: 8,
    overflow: "hidden",
  },
  phone: {
    position: "absolute",
  },
  fade: {
    position: "absolute",
    left: 0,
    right: 0,
    height: FADE,
  },
  fadeTop: {
    top: 0,
  },
  fadeBottom: {
    bottom: 0,
  },
  beatArea: {
    paddingHorizontal: 24,
    gap: 10,
    marginTop: 2,
  },
  beatLine: {
    // Room for two lines, so a longer beat never moves the phone.
    minHeight: 56,
    justifyContent: "center",
  },
  dots: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  dotActive: {
    width: 18,
  },
  center: {
    textAlign: "center",
  },
  footer: {
    paddingHorizontal: 24,
    paddingTop: 12,
    gap: 2,
  },
  promise: {
    marginTop: 2,
  },
});
