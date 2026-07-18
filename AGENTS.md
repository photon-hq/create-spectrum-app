# AGENTS.md

## Cursor Cloud specific instructions

`create-spectrum-project` is a **Bun/TypeScript CLI scaffolder** (like `create-next-app`) — there is **no long-running server, database, or web UI**. "Running the app" means executing the CLI, which stamps out a new Spectrum project. All standard commands live in `package.json` `scripts` (`build`, `typecheck`, `test`, `check`, `lint`, `lint:fix`).

Non-obvious notes for future agents (dependencies are already installed by the startup update script, so no install steps are needed here):

- **Runtime:** Bun is the required runtime/package manager (`engines`: bun >=1.3.0, node >=20). It is installed at `~/.bun/bin/bun` and symlinked into `/usr/local/bin`, so `bun` is already on `PATH` in fresh shells. `bun` (not `npm`) drives every script.
- **Run the CLI in dev:** `bun run src/bin.ts [directory] [flags]` (no build needed). Use `--platforms terminal --no-cloud -y` for a credential-free, no-network scaffold. `--help` lists all flags.
- **End-to-end "hello world":** scaffold a terminal project, then in the generated dir run `bun install` and `bun start`. The generated echo loop uses the `terminal` provider, which in a non-TTY shell runs in **plain readline mode** — pipe a line to test it, e.g. `printf 'hi\n' | bun start` prints `echo: hi`. Generating + installing the generated project **requires network** (pulls `spectrum-ts` from npm); the CLI itself falls back to a bundled manifest when offline.
- **Lint:** `bun run lint` (Biome via `bunx biome check .`) currently reports pre-existing formatting/style errors on `main` — these are not caused by your changes. Use `bun run lint:fix` only if a change is intended.
- **Tests:** `bun test` (unit + golden snapshot tests). Golden tests in `tests/golden/` compare scaffold output against committed snapshots. `bun run check` runs `typecheck` + `test` together.
