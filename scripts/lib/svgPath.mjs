// SVG path data in the strict form Android's PathParser reads.
//
// SVG allows compact arc flags ("A2 2 0 0022 17": the large-arc and sweep
// flags are single digits and may touch the next number). Android parses
// every token as a float, so "0022" becomes one number, an arc gets 5
// instead of 7 values and inflating the drawable crashes the app
// (Resources$NotFoundException). `normalizePathData` re-emits every command
// with explicitly separated numbers; `pathDataProblems` parses like Android
// and reports commands whose argument count is wrong
// (scripts/check-vectors.mts).

const ARGS = { M: 2, L: 2, T: 2, H: 1, V: 1, C: 6, S: 4, Q: 4, A: 7, Z: 0 };
const NUMBER = /^[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?/;

/** Splits SVG path data per the SVG grammar (arc flags are one digit). */
export function parseSvgPath(d) {
  const commands = [];
  let i = 0;
  let current = null;
  const skip = () => {
    while (i < d.length && /[\s,]/.test(d[i])) i += 1;
  };
  while (true) {
    skip();
    if (i >= d.length) break;
    const ch = d[i];
    if (/[a-zA-Z]/.test(ch)) {
      const type = ch.toUpperCase();
      if (!(type in ARGS)) throw new Error(`svg path: unknown command ${ch}`);
      current = { cmd: ch, args: [] };
      commands.push(current);
      i += 1;
      continue;
    }
    if (!current) throw new Error(`svg path: number before command in "${d}"`);
    const type = current.cmd.toUpperCase();
    const slot = current.args.length % 7;
    if (type === "A" && (slot === 3 || slot === 4)) {
      if (ch !== "0" && ch !== "1")
        throw new Error(`svg path: bad arc flag in "${d}"`);
      current.args.push(Number(ch));
      i += 1;
      continue;
    }
    const match = d.slice(i).match(NUMBER);
    if (!match) throw new Error(`svg path: unexpected "${ch}" in "${d}"`);
    current.args.push(Number(match[0]));
    i += match[0].length;
  }
  return commands;
}

/** Path data with every number separated (safe for Android). */
export function normalizePathData(d) {
  return parseSvgPath(d)
    .map(({ cmd, args }) => (args.length ? `${cmd}${args.join(" ")}` : cmd))
    .join(" ");
}

/**
 * Parses like Android's PathParser (every token is a float, flags are not
 * special) and lists commands whose argument count is not a non-zero
 * multiple of what the command takes.
 */
export function pathDataProblems(d) {
  const problems = [];
  const tokens =
    d.match(/[a-zA-Z]|[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?/g) ?? [];
  let cmd = null;
  let count = 0;
  let position = 0;
  const close = () => {
    if (cmd === null) return;
    const need = ARGS[cmd.toUpperCase()];
    const ok = need === 0 ? count === 0 : count > 0 && count % need === 0;
    if (!ok) {
      problems.push(
        `${cmd} at token ${position} needs a multiple of ${need} numbers, found ${count}`,
      );
    }
  };
  tokens.forEach((token, index) => {
    if (/[a-zA-Z]/.test(token)) {
      close();
      if (!(token.toUpperCase() in ARGS))
        problems.push(`unknown command ${token}`);
      cmd = token;
      count = 0;
      position = index;
    } else {
      count += 1;
    }
  });
  close();
  return problems;
}

/**
 * Absolute path data with only M/L/C/Q/Z (H/V/S/T expanded, elliptical arcs
 * converted to cubic Béziers), e.g. as input for CoreGraphics.
 */
export function toAbsoluteBasic(d) {
  const out = [];
  let x = 0,
    y = 0,
    sx = 0,
    sy = 0;
  let lastC = null,
    lastQ = null;
  for (const { cmd, args } of parseSvgPath(d)) {
    const rel = cmd === cmd.toLowerCase();
    const type = cmd.toUpperCase();
    const n = { M: 2, L: 2, T: 2, H: 1, V: 1, C: 6, S: 4, Q: 4, A: 7, Z: 0 }[
      type
    ];
    const groups = n === 0 ? [[]] : [];
    for (let k = 0; k < args.length; k += n) groups.push(args.slice(k, k + n));
    groups.forEach((g, index) => {
      const ox = rel ? x : 0,
        oy = rel ? y : 0;
      switch (type) {
        case "M": {
          x = g[0] + ox;
          y = g[1] + oy;
          if (index === 0) {
            sx = x;
            sy = y;
            out.push(`M ${x} ${y}`);
          } else out.push(`L ${x} ${y}`);
          lastC = lastQ = null;
          break;
        }
        case "L":
          x = g[0] + ox;
          y = g[1] + oy;
          out.push(`L ${x} ${y}`);
          lastC = lastQ = null;
          break;
        case "H":
          x = g[0] + (rel ? x : 0);
          out.push(`L ${x} ${y}`);
          lastC = lastQ = null;
          break;
        case "V":
          y = g[0] + (rel ? y : 0);
          out.push(`L ${x} ${y}`);
          lastC = lastQ = null;
          break;
        case "C": {
          const [x1, y1, x2, y2, ex, ey] = [
            g[0] + ox,
            g[1] + oy,
            g[2] + ox,
            g[3] + oy,
            g[4] + ox,
            g[5] + oy,
          ];
          out.push(`C ${x1} ${y1} ${x2} ${y2} ${ex} ${ey}`);
          lastC = [x2, y2];
          lastQ = null;
          x = ex;
          y = ey;
          break;
        }
        case "S": {
          const [x1, y1] = lastC
            ? [2 * x - lastC[0], 2 * y - lastC[1]]
            : [x, y];
          const [x2, y2, ex, ey] = [g[0] + ox, g[1] + oy, g[2] + ox, g[3] + oy];
          out.push(`C ${x1} ${y1} ${x2} ${y2} ${ex} ${ey}`);
          lastC = [x2, y2];
          lastQ = null;
          x = ex;
          y = ey;
          break;
        }
        case "Q": {
          const [x1, y1, ex, ey] = [g[0] + ox, g[1] + oy, g[2] + ox, g[3] + oy];
          out.push(`Q ${x1} ${y1} ${ex} ${ey}`);
          lastQ = [x1, y1];
          lastC = null;
          x = ex;
          y = ey;
          break;
        }
        case "T": {
          const [x1, y1] = lastQ
            ? [2 * x - lastQ[0], 2 * y - lastQ[1]]
            : [x, y];
          const [ex, ey] = [g[0] + ox, g[1] + oy];
          out.push(`Q ${x1} ${y1} ${ex} ${ey}`);
          lastQ = [x1, y1];
          lastC = null;
          x = ex;
          y = ey;
          break;
        }
        case "A": {
          const ex = g[5] + ox,
            ey = g[6] + oy;
          for (const c of arcToCubics(
            x,
            y,
            g[0],
            g[1],
            g[2],
            g[3],
            g[4],
            ex,
            ey,
          )) {
            out.push(`C ${c.join(" ")}`);
          }
          x = ex;
          y = ey;
          lastC = lastQ = null;
          break;
        }
        case "Z":
          out.push("Z");
          x = sx;
          y = sy;
          lastC = lastQ = null;
          break;
      }
    });
  }
  return out.join(" ");
}

/** SVG elliptical arc (endpoint form) as cubic Bézier segments. */
function arcToCubics(x1, y1, rx, ry, phiDeg, fa, fs, x2, y2) {
  if (rx === 0 || ry === 0 || (x1 === x2 && y1 === y2))
    return [[x1, y1, x2, y2, x2, y2]];
  const phi = (phiDeg * Math.PI) / 180;
  const cos = Math.cos(phi),
    sin = Math.sin(phi);
  const dx = (x1 - x2) / 2,
    dy = (y1 - y2) / 2;
  const x1p = cos * dx + sin * dy,
    y1p = -sin * dx + cos * dy;
  rx = Math.abs(rx);
  ry = Math.abs(ry);
  const lambda = (x1p * x1p) / (rx * rx) + (y1p * y1p) / (ry * ry);
  if (lambda > 1) {
    rx *= Math.sqrt(lambda);
    ry *= Math.sqrt(lambda);
  }
  const num = rx * rx * ry * ry - rx * rx * y1p * y1p - ry * ry * x1p * x1p;
  const den = rx * rx * y1p * y1p + ry * ry * x1p * x1p;
  const coef = (fa === fs ? -1 : 1) * Math.sqrt(Math.max(0, num / den));
  const cxp = (coef * rx * y1p) / ry,
    cyp = (-coef * ry * x1p) / rx;
  const cx = cos * cxp - sin * cyp + (x1 + x2) / 2;
  const cy = sin * cxp + cos * cyp + (y1 + y2) / 2;
  const angle = (ux, uy, vx, vy) => {
    const a = Math.atan2(ux * vy - uy * vx, ux * vx + uy * vy);
    return a;
  };
  const t1 = angle(1, 0, (x1p - cxp) / rx, (y1p - cyp) / ry);
  let dt = angle(
    (x1p - cxp) / rx,
    (y1p - cyp) / ry,
    (-x1p - cxp) / rx,
    (-y1p - cyp) / ry,
  );
  if (!fs && dt > 0) dt -= 2 * Math.PI;
  if (fs && dt < 0) dt += 2 * Math.PI;
  const segments = Math.ceil(Math.abs(dt) / (Math.PI / 2));
  const delta = dt / segments;
  const k = (4 / 3) * Math.tan(delta / 4);
  const point = (t) => [
    cx + rx * Math.cos(t) * cos - ry * Math.sin(t) * sin,
    cy + rx * Math.cos(t) * sin + ry * Math.sin(t) * cos,
  ];
  const deriv = (t) => [
    -rx * Math.sin(t) * cos - ry * Math.cos(t) * sin,
    -rx * Math.sin(t) * sin + ry * Math.cos(t) * cos,
  ];
  const result = [];
  let t = t1;
  for (let s = 0; s < segments; s += 1) {
    const [px, py] = point(t),
      [dx1, dy1] = deriv(t);
    const t2 = t + delta;
    const [qx, qy] = point(t2),
      [dx2, dy2] = deriv(t2);
    result.push([
      px + k * dx1,
      py + k * dy1,
      qx - k * dx2,
      qy - k * dy2,
      qx,
      qy,
    ]);
    t = t2;
  }
  // Land exactly on the endpoint.
  const last = result[result.length - 1];
  last[4] = x2;
  last[5] = y2;
  return result;
}
