import { describe, expect, test } from "bun:test";
import { buildNextSteps } from "~/bin.ts";

function stepsFor(targetDir: string, invokedFrom: string) {
  return buildNextSteps(
    {
      needsEnvFile: false,
      hasProviderEnvVars: false,
      steps: { installed: true, skillsInstalled: true, gitInitialized: true },
      targetDir,
    },
    { packageManager: "bun" },
    false,
    invokedFrom
  );
}

function commands(steps: ReturnType<typeof stepsFor>) {
  return steps.flatMap((s) => ("cmd" in s ? [s.cmd] : []));
}

describe("next steps — cd hint", () => {
  test("scaffolding into the current directory prints no cd step", () => {
    const steps = stepsFor(
      "/Users/testuser/Projects/prompt-test",
      "/Users/testuser/Projects/prompt-test"
    );
    expect(commands(steps)).toEqual(["bun start"]);
  });

  test("child directory target prints cd with the directory name", () => {
    const steps = stepsFor(
      "/Users/testuser/Projects/my-app",
      "/Users/testuser/Projects"
    );
    expect(commands(steps)).toEqual(["cd my-app", "bun start"]);
  });

  test("nested target prints the full relative path, not the basename", () => {
    const steps = stepsFor(
      "/Users/testuser/Projects/apps/foo",
      "/Users/testuser/Projects"
    );
    expect(commands(steps)).toEqual(["cd apps/foo", "bun start"]);
  });

  test("target with spaces is quoted so the command survives a shell", () => {
    const steps = stepsFor(
      "/Users/testuser/Projects/apps/my app",
      "/Users/testuser/Projects"
    );
    expect(commands(steps)).toEqual(["cd 'apps/my app'", "bun start"]);
  });

  test("shell metacharacters are single-quoted so they can't expand", () => {
    const steps = stepsFor(
      "/Users/testuser/Projects/$HOME dir",
      "/Users/testuser/Projects"
    );
    expect(commands(steps)).toEqual(["cd '$HOME dir'", "bun start"]);
  });

  test("embedded single quotes use the POSIX '\\'' escape", () => {
    const steps = stepsFor(
      "/Users/testuser/Projects/it's-a-dir",
      "/Users/testuser/Projects"
    );
    expect(commands(steps)).toEqual(["cd 'it'\\''s-a-dir'", "bun start"]);
  });

  test("plain paths stay unquoted", () => {
    const steps = stepsFor(
      "/Users/testuser/Projects/apps/my-app",
      "/Users/testuser/Projects"
    );
    expect(commands(steps)).toEqual(["cd apps/my-app", "bun start"]);
  });

  test("target outside the invocation directory prints a relative path", () => {
    const steps = stepsFor(
      "/Users/testuser/Projects/sibling",
      "/Users/testuser/Projects/prompt-test"
    );
    expect(commands(steps)).toEqual(["cd ../sibling", "bun start"]);
  });
});
