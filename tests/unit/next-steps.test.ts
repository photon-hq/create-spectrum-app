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
      "/Users/ryanzhu/Projects/prompt-test",
      "/Users/ryanzhu/Projects/prompt-test"
    );
    expect(commands(steps)).toEqual(["bun start"]);
  });

  test("child directory target prints cd with the directory name", () => {
    const steps = stepsFor(
      "/Users/ryanzhu/Projects/my-app",
      "/Users/ryanzhu/Projects"
    );
    expect(commands(steps)).toEqual(["cd my-app", "bun start"]);
  });

  test("nested target prints the full relative path, not the basename", () => {
    const steps = stepsFor(
      "/Users/ryanzhu/Projects/apps/foo",
      "/Users/ryanzhu/Projects"
    );
    expect(commands(steps)).toEqual(["cd apps/foo", "bun start"]);
  });

  test("target with spaces is quoted so the command survives a shell", () => {
    const steps = stepsFor(
      "/Users/ryanzhu/Projects/apps/my app",
      "/Users/ryanzhu/Projects"
    );
    expect(commands(steps)).toEqual(['cd "apps/my app"', "bun start"]);
  });

  test("plain paths stay unquoted", () => {
    const steps = stepsFor(
      "/Users/ryanzhu/Projects/apps/my-app",
      "/Users/ryanzhu/Projects"
    );
    expect(commands(steps)).toEqual(["cd apps/my-app", "bun start"]);
  });

  test("target outside the invocation directory prints a relative path", () => {
    const steps = stepsFor(
      "/Users/ryanzhu/Projects/sibling",
      "/Users/ryanzhu/Projects/prompt-test"
    );
    expect(commands(steps)).toEqual(["cd ../sibling", "bun start"]);
  });
});
