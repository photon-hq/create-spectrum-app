// Optional "support Spectrum" step: star spectrum-ts and follow the Photon org
// on GitHub via the `gh` CLI. Everything here is best-effort — the offer is
// only made when `gh` is installed and authenticated, and any individual action
// that fails warns without throwing, so a successful scaffold is never blocked.
import { spawn } from "node:child_process";

/** `github.com/photon-hq/spectrum-ts` — the repo new users are invited to star. */
export const SPECTRUM_TS_REPO = "photon-hq/spectrum-ts";

/** The Photon org handle new users are invited to follow. */
export const PHOTON_ORG = "photon-hq";

export interface GitHubLogger {
  step(msg: string): void;
  warn(msg: string): void;
}

/** Runs a `gh` subcommand; injectable so tests can stub it. */
export type GhRunner = (
  args: readonly string[],
  opts: { capture: boolean }
) => Promise<{ code: number; stdout: string }>;

export interface GitHubDeps {
  logger?: GitHubLogger;
  runner?: GhRunner;
}

export interface StarAndFollowResult {
  followed: boolean;
  starred: boolean;
}

const NOOP_LOGGER: GitHubLogger = {
  step: (msg) => process.stderr.write(`${msg}\n`),
  warn: (msg) => process.stderr.write(`warn: ${msg}\n`),
};

function spawnGh(
  args: readonly string[],
  capture: boolean
): Promise<{ code: number; stdout: string }> {
  return new Promise((resolveRun, rejectRun) => {
    const proc = spawn("gh", args as string[], {
      stdio: capture ? ["ignore", "pipe", "pipe"] : "inherit",
    });
    let stdout = "";
    if (capture) {
      proc.stdout?.setEncoding("utf8");
      proc.stdout?.on("data", (chunk: string) => {
        stdout += chunk;
      });
      // Drain stderr so the pipe can't fill and stall the child.
      proc.stderr?.resume();
    }
    proc.once("error", rejectRun);
    proc.once("close", (code) => resolveRun({ code: code ?? -1, stdout }));
  });
}

function defaultRunner(): GhRunner {
  return (args, { capture }) => spawnGh(args, capture);
}

/**
 * Whether the GitHub star/follow step can be offered: the `gh` CLI is on PATH
 * **and** the user is authenticated. Any failure — `gh` missing (spawn error),
 * `gh --version` non-zero, or `gh auth status` non-zero (not logged in) — means
 * "don't offer", so this never throws.
 */
export async function canOfferGitHub(deps: GitHubDeps = {}): Promise<boolean> {
  const run = deps.runner ?? defaultRunner();
  try {
    const version = await run(["--version"], { capture: true });
    if (version.code !== 0) {
      return false;
    }
    const auth = await run(["auth", "status"], { capture: true });
    return auth.code === 0;
  } catch {
    // `gh` not installed (spawn ENOENT) or otherwise unusable.
    return false;
  }
}

async function star(run: GhRunner, logger: GitHubLogger): Promise<boolean> {
  try {
    // `PUT /user/starred/{owner}/{repo}` — idempotent, 204 whether or not the
    // repo was already starred, so re-running is harmless.
    const { code } = await run(
      ["api", "--method", "PUT", `user/starred/${SPECTRUM_TS_REPO}`],
      { capture: true }
    );
    if (code !== 0) {
      logger.warn(`Could not star ${SPECTRUM_TS_REPO} (gh exited ${code}).`);
      return false;
    }
    logger.step(`Starred ${SPECTRUM_TS_REPO}`);
    return true;
  } catch (err) {
    logger.warn(
      `Could not star ${SPECTRUM_TS_REPO} (${err instanceof Error ? err.message : String(err)}).`
    );
    return false;
  }
}

async function follow(run: GhRunner, logger: GitHubLogger): Promise<boolean> {
  try {
    // `PUT /user/following/{username}` — idempotent for a followable account.
    const { code } = await run(
      ["api", "--method", "PUT", `user/following/${PHOTON_ORG}`],
      { capture: true }
    );
    if (code !== 0) {
      logger.warn(`Could not follow @${PHOTON_ORG} (gh exited ${code}).`);
      return false;
    }
    logger.step(`Now following @${PHOTON_ORG}`);
    return true;
  } catch (err) {
    logger.warn(
      `Could not follow @${PHOTON_ORG} (${err instanceof Error ? err.message : String(err)}).`
    );
    return false;
  }
}

/**
 * Star spectrum-ts and follow the Photon org — the two GitHub actions behind a
 * single "yes". Each runs independently so one failing (e.g. following isn't
 * possible for the account) doesn't stop the other, and neither throws.
 */
export async function starAndFollow(
  deps: GitHubDeps = {}
): Promise<StarAndFollowResult> {
  const logger = deps.logger ?? NOOP_LOGGER;
  const run = deps.runner ?? defaultRunner();
  const starred = await star(run, logger);
  const followed = await follow(run, logger);
  return { starred, followed };
}
