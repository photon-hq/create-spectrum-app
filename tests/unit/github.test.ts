import { describe, expect, test } from "bun:test";
import {
  canOfferGitHub,
  type GhRunner,
  PHOTON_ORG,
  SPECTRUM_TS_REPO,
  starAndFollow,
} from "~/github.ts";
import { silentLogger } from "../helpers/logger.ts";

interface Resp {
  code: number;
  stdout?: string;
}

/**
 * Canonical key for a `gh` invocation so tests can script replies per command
 * without caring about the exact flag order. `api` calls collapse to their
 * endpoint (the last arg); everything else keys on the full arg list.
 */
function canon(args: readonly string[]): string {
  if (args[0] === "api") {
    return args.at(-1) ?? "";
  }
  return args.join(" ");
}

/** Records every invocation and replies from a per-command script. */
function fakeRunner(responses: Record<string, Resp | Error>): {
  runner: GhRunner;
  calls: string[][];
} {
  const calls: string[][] = [];
  const runner: GhRunner = (args) => {
    calls.push([...args]);
    const reply = responses[canon(args)] ?? { code: 0, stdout: "" };
    if (reply instanceof Error) {
      return Promise.reject(reply);
    }
    return Promise.resolve({ code: reply.code, stdout: reply.stdout ?? "" });
  };
  return { runner, calls };
}

const STAR_CALL = [
  "api",
  "--method",
  "PUT",
  `user/starred/${SPECTRUM_TS_REPO}`,
];
const FOLLOW_CALL = ["api", "--method", "PUT", `user/following/${PHOTON_ORG}`];

describe("canOfferGitHub", () => {
  test("gh installed and authenticated → true", async () => {
    const { runner, calls } = fakeRunner({
      "--version": { code: 0, stdout: "gh version 2.91.0" },
      "auth status": { code: 0 },
    });

    expect(await canOfferGitHub({ runner })).toBe(true);
    expect(calls).toContainEqual(["--version"]);
    expect(calls).toContainEqual(["auth", "status"]);
  });

  test("gh not installed (spawn error) → false, auth never checked", async () => {
    const { runner, calls } = fakeRunner({
      "--version": new Error("spawn gh ENOENT"),
    });

    expect(await canOfferGitHub({ runner })).toBe(false);
    // Bailed before ever asking about auth.
    expect(calls.some((c) => c[0] === "auth")).toBe(false);
  });

  test("gh present but --version non-zero → false", async () => {
    const { runner, calls } = fakeRunner({
      "--version": { code: 1 },
    });

    expect(await canOfferGitHub({ runner })).toBe(false);
    expect(calls.some((c) => c[0] === "auth")).toBe(false);
  });

  test("gh installed but not authenticated → false", async () => {
    const { runner } = fakeRunner({
      "--version": { code: 0 },
      "auth status": { code: 1 },
    });

    expect(await canOfferGitHub({ runner })).toBe(false);
  });

  test("auth check throwing is swallowed → false", async () => {
    const { runner } = fakeRunner({
      "--version": { code: 0 },
      "auth status": new Error("boom"),
    });

    expect(await canOfferGitHub({ runner })).toBe(false);
  });
});

describe("starAndFollow", () => {
  test("both succeed → stars then follows", async () => {
    const { runner, calls } = fakeRunner({
      [`user/starred/${SPECTRUM_TS_REPO}`]: { code: 0 },
      [`user/following/${PHOTON_ORG}`]: { code: 0 },
    });
    const logger = silentLogger();

    const result = await starAndFollow({ runner, logger });

    expect(result).toEqual({ starred: true, followed: true });
    expect(calls).toContainEqual(STAR_CALL);
    expect(calls).toContainEqual(FOLLOW_CALL);
    // Star is attempted before follow.
    const starIdx = calls.findIndex((c) => c[3] === STAR_CALL[3]);
    const followIdx = calls.findIndex((c) => c[3] === FOLLOW_CALL[3]);
    expect(starIdx).toBeGreaterThanOrEqual(0);
    expect(followIdx).toBeGreaterThan(starIdx);
    // Success is surfaced via the logger.
    expect(logger.steps).toContain(`Starred ${SPECTRUM_TS_REPO}`);
    expect(logger.steps).toContain(`Now following @${PHOTON_ORG}`);
    expect(logger.warnings).toHaveLength(0);
  });

  test("star fails but follow still runs", async () => {
    const { runner, calls } = fakeRunner({
      [`user/starred/${SPECTRUM_TS_REPO}`]: { code: 1 },
      [`user/following/${PHOTON_ORG}`]: { code: 0 },
    });
    const logger = silentLogger();

    const result = await starAndFollow({ runner, logger });

    expect(result).toEqual({ starred: false, followed: true });
    // Follow is not short-circuited by the star failure.
    expect(calls).toContainEqual(FOLLOW_CALL);
    expect(logger.warnings.some((w) => w.includes(SPECTRUM_TS_REPO))).toBe(
      true
    );
  });

  test("follow fails but star succeeds", async () => {
    const { runner } = fakeRunner({
      [`user/starred/${SPECTRUM_TS_REPO}`]: { code: 0 },
      [`user/following/${PHOTON_ORG}`]: { code: 1 },
    });
    const logger = silentLogger();

    const result = await starAndFollow({ runner, logger });

    expect(result).toEqual({ starred: true, followed: false });
    expect(logger.warnings.some((w) => w.includes(PHOTON_ORG))).toBe(true);
  });

  test("spawn error on star is swallowed, follow still runs", async () => {
    const { runner, calls } = fakeRunner({
      [`user/starred/${SPECTRUM_TS_REPO}`]: new Error("spawn gh ENOENT"),
      [`user/following/${PHOTON_ORG}`]: { code: 0 },
    });

    const result = await starAndFollow({ runner, logger: silentLogger() });

    expect(result).toEqual({ starred: false, followed: true });
    expect(calls).toContainEqual(FOLLOW_CALL);
  });

  test("both fail → all false, no throw", async () => {
    const { runner } = fakeRunner({
      [`user/starred/${SPECTRUM_TS_REPO}`]: { code: 1 },
      [`user/following/${PHOTON_ORG}`]: { code: 1 },
    });

    const result = await starAndFollow({ runner, logger: silentLogger() });

    expect(result).toEqual({ starred: false, followed: false });
  });
});
