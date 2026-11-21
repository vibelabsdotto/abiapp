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
