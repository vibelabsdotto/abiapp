// The AbiApp mark "1,0" as a vector in the current ink, so it follows
// light and dark without separate images. Geometry from the icon source
// (AbiApp-2.0/icon/final/quelle-zeichen.svg).

import React from "react";
import Svg, { G, Path } from "react-native-svg";

const VIEW_WIDTH = 760;
const VIEW_HEIGHT = 680;

export const BrandMark = ({
  height,
  color,
}: {
  height: number;
  color: string;
}) => (
  <Svg
    width={(height * VIEW_WIDTH) / VIEW_HEIGHT}
    height={height}
    viewBox={`132 201 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}
    accessible={false}
  >
    <G transform="translate(140.18,782.91)" fill={color}>
      <Path d="M88.77,-573.44 L191.99,-573.44 L191.99,0.00 L88.77,0.00 L88.77,-490.86 L0.00,-424.80 L0.00,-507.38 Z" />
      <Path d="M229.26,-72.25 A72.25,72.25 0 0 1 373.77,-72.25 C373.77,18.06 305.85,52.02 271.17,86.70 A12.28,12.28 0 0 1 253.83,69.36 C275.50,47.69 274.06,14.45 260.07,-13.07 A72.25,72.25 0 0 1 229.26,-72.25 Z" />
      <Path
        fillRule="evenodd"
        d="M411.04,-407.14 A166.30,166.30 0 0 1 743.64,-407.14 L743.64,-166.30 A166.30,166.30 0 0 1 411.04,-166.30 Z M514.26,-407.14 L514.26,-166.30 A63.08,63.08 0 0 0 640.42,-166.30 L640.42,-407.14 A63.08,63.08 0 0 0 514.26,-407.14 Z"
      />
    </G>
  </Svg>
);
