// ArchGauge - the AbiApp arch: two legs and a half circle, filled from the
// left foot over the top. Same geometry as the app icon. Used by GradeHero
// (with markers) and as the brand mark (EmptyState, onboarding).
//
// The fill animates once on mount unless the user prefers reduced motion.

import React, { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import Svg, { Circle, Line, Path, Rect } from "react-native-svg";
import Animated, {
  Easing,
  useAnimatedProps,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export interface ArchMarker {
  /** Position along the arch, 0 (left foot) to 1 (right foot). */
  at: number;
  /** notch: gap across the stroke; dot: filled circle on the stroke. */
  kind: "notch" | "dot";
  color: string;
}

export interface ArchGaugeProps {
  width: number;
  /** 0..1 */
  progress: number;
  color: string;
  trackColor: string;
  /** Stroke width relative to the radius (icon: 0.57, gauge: 0.18). */
  strokeRatio?: number;
  /** Leg length relative to the radius. */
  legRatio?: number;
  markers?: ArchMarker[];
  /** Horizontal bar between the legs: turns the arch into the "A" mark. */
  crossbar?: boolean;
  /** Background behind the gauge; notches are cut in this colour. */
  surfaceColor?: string;
  animated?: boolean;
  /** Content centred inside the arch (e.g. the grade). */
  children?: React.ReactNode;
}

interface Geometry {
  cx: number;
  cy: number;
  r: number;
  leg: number;
  total: number;
}

/** Point on the centerline at arc length s (worklet: used in animations). */
const pointAt = (g: Geometry, s: number) => {
  "worklet";
  if (s <= g.leg) return { x: g.cx - g.r, y: g.cy + g.leg - s };
  const arc = Math.PI * g.r;
  if (s <= g.leg + arc) {
    const a = Math.PI - (s - g.leg) / g.r;
    return { x: g.cx + g.r * Math.cos(a), y: g.cy - g.r * Math.sin(a) };
  }
  return { x: g.cx + g.r, y: g.cy + (s - g.leg - arc) };
};

/** Unit normal (pointing outwards) at arc length s. */
const normalAt = (g: Geometry, s: number) => {
  if (s <= g.leg) return { x: -1, y: 0 };
  if (s <= g.leg + Math.PI * g.r) {
    const a = Math.PI - (s - g.leg) / g.r;
    return { x: Math.cos(a), y: -Math.sin(a) };
  }
  return { x: 1, y: 0 };
};

const clamp01 = (value: number) =>
  Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0;

export const ArchGauge = ({
  width,
  progress,
  color,
  trackColor,
  strokeRatio = 0.18,
  legRatio = 0.62,
  markers = [],
  crossbar = false,
  surfaceColor = "transparent",
  animated = true,
  children,
}: ArchGaugeProps) => {
  const reduceMotion = useReducedMotion();
  const r = width / (2 + strokeRatio);
  const stroke = r * strokeRatio;
  const leg = r * legRatio;
  const height = r + stroke / 2 + leg;
  const g: Geometry = {
    cx: width / 2,
    cy: stroke / 2 + r,
    r,
    leg,
    total: 2 * leg + Math.PI * r,
  };
  const target = clamp01(progress);
  const shouldAnimate = animated && !reduceMotion;

  const shown = useSharedValue(shouldAnimate ? 0 : target);
  useEffect(() => {
    shown.value = shouldAnimate
      ? withTiming(target, {
          duration: 900,
          easing: Easing.out(Easing.cubic),
        })
      : target;
  }, [shown, target, shouldAnimate]);

  const d = `M ${g.cx - r} ${g.cy + leg} L ${g.cx - r} ${g.cy} A ${r} ${r} 0 0 1 ${g.cx + r} ${g.cy} L ${g.cx + r} ${g.cy + leg}`;

  const fillProps = useAnimatedProps(() => ({
    strokeDashoffset: g.total * (1 - shown.value),
  }));
  const capProps = useAnimatedProps(() => {
    const p = pointAt(g, g.total * shown.value);
    return {
      cx: p.x,
      cy: p.y,
      r: shown.value > 0.001 && shown.value < 0.999 ? stroke / 2 : 0,
    };
  });

  const inner = r - stroke / 2;

  return (
    <View style={{ width, height }}>
      <Svg width={width} height={height}>
        <Path d={d} stroke={trackColor} strokeWidth={stroke} fill="none" />
        <AnimatedPath
          d={d}
          stroke={color}
          strokeWidth={stroke}
          fill="none"
          strokeDasharray={[g.total, g.total]}
          animatedProps={fillProps}
        />
        <AnimatedCircle fill={color} animatedProps={capProps} />
        {crossbar ? (
          <Rect
            x={g.cx - inner - 0.5}
            y={g.cy + leg * 0.3 - stroke * 0.31}
            width={inner * 2 + 1}
            height={stroke * 0.62}
            fill={color}
          />
        ) : null}
        {markers.map((marker) => {
          const s = g.total * clamp01(marker.at);
          const p = pointAt(g, s);
          if (marker.kind === "dot") {
            return (
              <Circle
                key={`dot-${marker.at}`}
                cx={p.x}
                cy={p.y}
                r={stroke * 0.3}
                fill={marker.color}
                stroke={surfaceColor}
                strokeWidth={2}
              />
            );
          }
          const n = normalAt(g, s);
          const reach = stroke / 2 + 1;
          return (
            <Line
              key={`notch-${marker.at}`}
              x1={p.x - n.x * reach}
              y1={p.y - n.y * reach}
              x2={p.x + n.x * reach}
              y2={p.y + n.y * reach}
              stroke={marker.color}
              strokeWidth={Math.max(2, stroke * 0.14)}
            />
          );
        })}
      </Svg>
      {children ? (
        <View
          pointerEvents="none"
          style={[
            styles.overlay,
            {
              top: stroke + r * 0.18,
              left: stroke,
              right: stroke,
            },
          ]}
        >
          {children}
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    position: "absolute",
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
  },
});
