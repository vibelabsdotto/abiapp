// ArchGauge - the AbiApp arch: two legs and a half circle, filled from the
// left foot over the top. Same geometry as the app icon. Used by GradeHero
// (thin, with markers) and as the brand mark (EmptyState, onboarding).
//
// `fill` gives the progress the shape language of PointsBadge: "solid" for
// an official result, "outline" (hollow band, fine contour) for a
// prognosis, "dashed" (hollow band, dashed contour) for an estimate. A
// prognosis reads differently by its shape, not by colour. The fill
// animates once on mount unless the user prefers reduced motion.

import React, { useEffect, useId } from "react";
import { StyleSheet, View } from "react-native";
import Svg, { Circle, Defs, Line, Mask, Path, Rect } from "react-native-svg";
import Animated, {
  Easing,
  useAnimatedProps,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

const AnimatedPath = Animated.createAnimatedComponent(Path);

export interface ArchMarker {
  /** Position along the arch, 0 (left foot) to 1 (right foot). */
  at: number;
  /**
   * notch: gap across the stroke; tick: short scale mark outside the arch;
   * dot: filled circle on the stroke.
   */
  kind: "notch" | "tick" | "dot";
  color: string;
}

export interface ArchGaugeProps {
  width: number;
  /** 0..1 */
  progress: number;
  color: string;
  trackColor: string;
  /** Stroke width relative to the radius (icon: 0.57, hero: 0.06). */
  strokeRatio?: number;
  /** Leg length relative to the radius. */
  legRatio?: number;
  markers?: ArchMarker[];
  /** Horizontal bar between the legs: turns the arch into the "A" mark. */
  crossbar?: boolean;
  /** Shape of the progress band (see header). */
  fill?: "solid" | "outline" | "dashed";
  /** Track width in pt; defaults to the band width (icon mark). */
  trackWidth?: number;
  /** Contour width of outline/dashed fills. */
  contourWidth?: number;
  /** Background behind the gauge; notches and dot rings use this colour. */
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

/** Room outside the stroke for tick marks. */
const TICK = 7;

export const ArchGauge = ({
  width,
  progress,
  color,
  trackColor,
  strokeRatio = 0.18,
  legRatio = 0.62,
  markers = [],
  crossbar = false,
  fill = "solid",
  trackWidth,
  contourWidth = 1.5,
  surfaceColor = "transparent",
  animated = true,
  children,
}: ArchGaugeProps) => {
  const maskId = `arch-${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  const reduceMotion = useReducedMotion();
  const hasTicks = markers.some((marker) => marker.kind === "tick");
  const inset = hasTicks ? TICK + 2 : 0;
  const r = (width - 2 * inset) / (2 + strokeRatio);
  const stroke = r * strokeRatio;
  const leg = r * legRatio;
  const height = inset + r + stroke / 2 + leg;
  const g: Geometry = {
    cx: width / 2,
    cy: inset + stroke / 2 + r,
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

  // Each animated path needs its own animated props object.
  const progressProps = () => {
    "worklet";
    return { strokeDashoffset: g.total * (1 - shown.value) };
  };
  const fillProps = useAnimatedProps(progressProps);
  const innerProps = useAnimatedProps(progressProps);
  const maskProps = useAnimatedProps(progressProps);
  const coverProps = useAnimatedProps(progressProps);

  const inner = r - stroke / 2;
  /** Centerline path shifted outwards (+) or inwards (-) by `offset`. */
  const shifted = (offset: number) => {
    const rr = r + offset;
    return `M ${g.cx - rr} ${g.cy + leg} L ${g.cx - rr} ${g.cy} A ${rr} ${rr} 0 0 1 ${g.cx + rr} ${g.cy} L ${g.cx + rr} ${g.cy + leg}`;
  };
  const edge = stroke / 2 - contourWidth / 2;
  const dash = Math.max(3, stroke * 0.6);
  const progressDash = [g.total, g.total];

  return (
    <View style={{ width, height }}>
      <Svg width={width} height={height}>
        <Path
          d={d}
          stroke={trackColor}
          strokeWidth={trackWidth ?? stroke}
          fill="none"
        />
        {fill === "solid" ? (
          <AnimatedPath
            d={d}
            stroke={color}
            strokeWidth={stroke}
            strokeLinecap={trackWidth === undefined ? "butt" : "round"}
            fill="none"
            strokeDasharray={progressDash}
            animatedProps={fillProps}
          />
        ) : fill === "outline" ? (
          <>
            {/* Hollow band: the band in ink, its inside in the surface. */}
            <AnimatedPath
              d={d}
              stroke={color}
              strokeWidth={stroke}
              strokeLinecap="round"
              fill="none"
              strokeDasharray={progressDash}
              animatedProps={fillProps}
            />
            <AnimatedPath
              d={d}
              stroke={surfaceColor}
              strokeWidth={Math.max(0, stroke - 2 * contourWidth)}
              strokeLinecap="round"
              fill="none"
              strokeDasharray={progressDash}
              animatedProps={innerProps}
            />
          </>
        ) : (
          <>
            <Defs>
              <Mask
                id={maskId}
                maskUnits="userSpaceOnUse"
                x={0}
                y={0}
                width={width}
                height={height}
              >
                <AnimatedPath
                  d={d}
                  stroke="white"
                  strokeWidth={stroke + 2}
                  fill="none"
                  strokeDasharray={progressDash}
                  animatedProps={maskProps}
                />
              </Mask>
            </Defs>
            {/* Hollow band with dashed edges; the inside hides the track. */}
            <AnimatedPath
              d={d}
              stroke={surfaceColor}
              strokeWidth={stroke}
              fill="none"
              strokeDasharray={progressDash}
              animatedProps={coverProps}
            />
            {[edge, -edge].map((offset) => (
              <Path
                key={offset}
                d={shifted(offset)}
                stroke={color}
                strokeWidth={contourWidth}
                strokeDasharray={[dash, dash * 0.8]}
                fill="none"
                mask={`url(#${maskId})`}
              />
            ))}
          </>
        )}
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
          const n = normalAt(g, s);
          if (marker.kind === "dot") {
            return (
              <Circle
                key={`dot-${marker.at}`}
                cx={p.x}
                cy={p.y}
                r={Math.max(4.5, stroke * 0.3)}
                fill={marker.color}
                stroke={surfaceColor}
                strokeWidth={2.5}
              />
            );
          }
          if (marker.kind === "tick") {
            // Crosses the track: from the band's inner edge to just outside
            // it, so the mark sits on the arch on legs and arc alike.
            const from = -stroke / 2;
            const to = stroke / 2 + TICK - 2;
            return (
              <Line
                key={`tick-${marker.at}`}
                x1={p.x + n.x * from}
                y1={p.y + n.y * from}
                x2={p.x + n.x * to}
                y2={p.y + n.y * to}
                stroke={marker.color}
                strokeWidth={1.5}
              />
            );
          }
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
              top: inset + stroke + r * 0.16,
              left: inset + stroke,
              right: inset + stroke,
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
