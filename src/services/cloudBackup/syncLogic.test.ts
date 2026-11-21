import { describe, expect, it } from "vitest";

import {
  calendarDayOffset,
  canonicalJson,
  decideSync,
  hashData,
  hashString,
  isFromNewerApp,
  utf8Length,
  type DecisionInput,
  type RemoteView,
} from "./syncLogic";

const local = (hash: string, empty = false) => ({ hash, empty });
const remote = (
  revision: string,
  dataHash: string,
  empty = false,
  parentRevision: string | null = null,
): RemoteView => ({ kind: "ok", revision, parentRevision, dataHash, empty });
/** Base after taking over snapshot `remoteRevision` with `remoteHash`. */
const base = (
  localHash: string,
  remoteRevision: string,
  remoteHash = localHash,
  ownUpload = false,
) => ({ localHash, remoteRevision, remoteHash, ownUpload });
const decide = (input: DecisionInput) => decideSync(input);

describe("decideSync: nothing in the cloud", () => {
  it("uploads local data", () => {
    expect(decide({ local: local("a"), base: null, remote: null })).toBe(
      "upload",
    );
  });

  it("uploads again after the cloud copy disappeared", () => {
    expect(
      decide({ local: local("a"), base: base("a", "r1"), remote: null }),
    ).toBe("upload");
  });

  it("does nothing on an empty device", () => {
    expect(decide({ local: local("e", true), base: null, remote: null })).toBe(
      "none",
    );
  });
});

describe("decideSync: last sync recorded", () => {
  it("does nothing when neither side changed", () => {
    expect(
      decide({
        local: local("a"),
        base: base("a", "r1"),
        remote: remote("r1", "a"),
      }),
    ).toBe("none");
  });

  it("does nothing when the restored data hashes differently than uploaded", () => {
    expect(
      decide({
        local: local("a2"),
        base: base("a2", "r1", "a"),
        remote: remote("r1", "a"),
      }),
    ).toBe("none");
  });

  it("uploads local changes", () => {
    expect(
      decide({
        local: local("b"),
        base: base("a", "r1"),
        remote: remote("r1", "a"),
      }),
    ).toBe("upload");
  });

  it("applies a newer cloud snapshot when the device is unchanged", () => {
    expect(
      decide({
        local: local("a"),
        base: base("a", "r1"),
        remote: remote("r2", "c"),
      }),
    ).toBe("apply");
  });

  it("asks when both sides changed", () => {
    expect(
      decide({
        local: local("b"),
        base: base("a", "r1"),
        remote: remote("r2", "c"),
      }),
    ).toBe("conflict");
  });

  it("only records the base when both sides changed to the same content", () => {
    expect(
      decide({
        local: local("c"),
        base: base("a", "r1"),
        remote: remote("r2", "c"),
      }),
    ).toBe("markSynced");
  });
});

describe("decideSync: two devices write while offline", () => {
  // Device A uploaded r2 (based on r1). Device B, also offline and also
  // based on r1, uploaded r3 later; iCloud keeps the later write.
  const afterOwnUpload = base("a", "r2", "a", true);

  it("asks when the cloud copy was written without seeing our upload", () => {
    expect(
      decide({
        local: local("a"),
        base: afterOwnUpload,
        remote: remote("r3", "b", false, "r1"),
      }),
    ).toBe("conflict");
  });

  it("applies a later snapshot that was based on our upload", () => {
    expect(
      decide({
        local: local("a"),
        base: afterOwnUpload,
        remote: remote("r3", "b", false, "r2"),
      }),
    ).toBe("apply");
  });

  it("counts the same revision with a foreign hash as a cloud change", () => {
    expect(
      decide({
        local: local("a"),
        base: base("a", "r2", "a"),
        remote: remote("r2", "b"),
      }),
    ).toBe("apply");
    expect(
      decide({
        local: local("a"),
        base: afterOwnUpload,
        remote: remote("r2", "b", false, "r1"),
      }),
    ).toBe("conflict");
  });

  it("applies any newer snapshot when the last one came from the cloud", () => {
    expect(
      decide({
        local: local("a"),
        base: base("a", "r2"),
        remote: remote("r4", "c", false, "r3"),
      }),
    ).toBe("apply");
  });
});

describe("decideSync: first sync on this device", () => {
  it("records the base when the content matches", () => {
    expect(
      decide({ local: local("a"), base: null, remote: remote("r1", "a") }),
    ).toBe("markSynced");
  });

  it("asks when both hold different data, never overwrites either side", () => {
    expect(
      decide({ local: local("b"), base: null, remote: remote("r1", "a") }),
    ).toBe("conflict");
    expect(
      decide({
        local: local("b"),
        base: null,
        remote: remote("r7", "a", false, "r6"),
      }),
    ).toBe("conflict");
  });

  it("offers the restore on a fresh install", () => {
    expect(
      decide({
        local: local("e", true),
        base: null,
        remote: remote("r1", "a"),
      }),
    ).toBe("offerRestore");
  });

  it("does not offer a declined snapshot again", () => {
    expect(
      decide({
        local: local("e", true),
        base: null,
        remote: remote("r1", "a"),
        declinedRevision: "r1",
      }),
    ).toBe("none");
  });

  it("offers a newer snapshot after a declined one", () => {
    expect(
      decide({
        local: local("e", true),
        base: null,
        remote: remote("r2", "c"),
        declinedRevision: "r1",
      }),
    ).toBe("offerRestore");
  });
});

describe("decideSync: empty sides", () => {
  it("never uploads an empty device over cloud data", () => {
    expect(
      decide({
        local: local("e", true),
        base: base("a", "r1"),
        remote: remote("r1", "a"),
      }),
    ).toBe("offerRestore");
  });

  it("does nothing when both are empty", () => {
    expect(
      decide({
        local: local("e", true),
        base: null,
        remote: remote("r1", "x", true),
      }),
    ).toBe("none");
  });

  it("overwrites an empty snapshot with local data", () => {
    expect(
      decide({
        local: local("a"),
        base: base("a", "r1"),
        remote: remote("r2", "x", true),
      }),
    ).toBe("upload");
  });
});

describe("decideSync: incompatible cloud snapshot", () => {
  it("blocks a snapshot from a newer app, even with local changes", () => {
    for (const input of [local("a"), local("e", true)]) {
      expect(
        decide({
          local: input,
          base: base("x", "r1"),
          remote: { kind: "tooNew" },
        }),
      ).toBe("blockedTooNew");
    }
  });

  it("repairs a broken snapshot with local data", () => {
    expect(
      decide({
        local: local("a"),
        base: base("a", "r1"),
        remote: { kind: "invalid" },
      }),
    ).toBe("upload");
  });

  it("leaves a broken snapshot alone on an empty device", () => {
    expect(
      decide({
        local: local("e", true),
        base: null,
        remote: { kind: "invalid" },
      }),
    ).toBe("none");
  });
});

describe("isFromNewerApp", () => {
  const known = { backupVersion: 1, schemaVersion: 3 };

  it("accepts the same or older versions", () => {
    expect(isFromNewerApp({ version: 1, schemaVersion: 3 }, known)).toBe(false);
    expect(isFromNewerApp({ version: 1, schemaVersion: 1 }, known)).toBe(false);
  });

  it("detects a newer format or schema", () => {
    expect(isFromNewerApp({ version: 2, schemaVersion: 3 }, known)).toBe(true);
    expect(isFromNewerApp({ version: 1, schemaVersion: 4 }, known)).toBe(true);
  });
});

describe("hashing", () => {
  it("is stable and hex", () => {
    expect(hashString("abc")).toBe(hashString("abc"));
    expect(hashString("abc")).toMatch(/^[0-9a-f]{14}$/);
    expect(hashString("abc")).not.toBe(hashString("abd"));
  });

  it("ignores object key order but not array order", () => {
    expect(hashData({ a: 1, b: [1, 2] })).toBe(hashData({ b: [1, 2], a: 1 }));
    expect(hashData({ b: [1, 2] })).not.toBe(hashData({ b: [2, 1] }));
  });

  it("serializes canonically", () => {
    expect(canonicalJson({ b: null, a: "x", c: undefined })).toBe(
      '{"a":"x","b":null}',
    );
  });
});

describe("utf8Length", () => {
  it("counts multi-byte characters", () => {
    expect(utf8Length("abc")).toBe(3);
    expect(utf8Length("ä")).toBe(2);
    expect(utf8Length("„")).toBe(3);
    expect(utf8Length("😀")).toBe(4);
  });
});

describe("calendarDayOffset", () => {
  const now = new Date(2026, 10, 21, 0, 30);

  it("counts local calendar days, not 24-hour spans", () => {
    expect(calendarDayOffset(new Date(2026, 10, 21, 0, 5), now)).toBe(0);
    expect(calendarDayOffset(new Date(2026, 10, 20, 23, 50), now)).toBe(1);
    expect(calendarDayOffset(new Date(2026, 10, 14, 12), now)).toBe(7);
  });

  it("crosses the daylight saving change", () => {
    expect(
      calendarDayOffset(new Date(2026, 2, 28, 12), new Date(2026, 2, 30, 12)),
    ).toBe(2);
  });
});
