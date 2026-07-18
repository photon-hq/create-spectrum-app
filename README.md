# create-spectrum-project

Scaffolds a new [Spectrum](https://photon.codes/docs/spectrum-ts/introduction) project: providers wired up, dependencies installed, and a runnable echo loop on the first command.

## Interactive

```sh
bun create spectrum-project@latest
# or
npm create spectrum-project@latest
# or
pnpm create spectrum-project@latest
# or
yarn create spectrum-project@latest
```

You'll be asked for:

- Which interface (terminal sandbox, iMessage, Telegram, or WhatsApp Business)
- Your package manager (auto-detected)
- Whether to install dependencies and initialize git
- Whether to install the `spectrum` agent skill (default: yes)

At the very end — only if the [GitHub CLI](https://cli.github.com) (`gh`) is installed and authenticated — you'll be offered a one-tap way to support the project: saying yes stars [`spectrum-ts`](https://github.com/photon-hq/spectrum-ts) and follows [`@photon-hq`](https://github.com/photon-hq) on GitHub via `gh`. It's skipped entirely with `-y`, when `gh` is missing or logged out, and in non-interactive shells.

The generated project includes `src/index.ts` with the selected providers wired in, a `package.json` pinned to the current `spectrum-ts` release, an `AGENTS.md` + `CLAUDE.md` so AI coding agents have project context immediately, the `spectrum` skill from [`photon-hq/skills`](https://github.com/photon-hq/skills) installed locally, a ready-to-fill `.env` (plus a tracked `.env.example`) for any required credentials, and an echo loop that runs on `bun start`.

## Non-interactive

Pass flags to skip prompts. Run `bun create spectrum-project@latest --help` for the full list.

```
Usage: create-spectrum-project [directory] [options]

Options:
  --platforms <list>   Comma-separated keys: terminal, imessage, telegram, whatsapp-business
                       (alias: --providers)
  --projectId <id>     Use an existing Spectrum Cloud project (skip create, read its
                       secret into .env)
  --pm <m>             bun | npm | pnpm | yarn (default: detected)
  --no-install         Skip dependency install
  --no-git             Skip git init
  --no-skills          Skip Spectrum skill install
  --no-cloud           Skip Spectrum Cloud project setup
  --yes                Use defaults; skip interactive prompts
  --verbose            Stream install stdout/stderr
  -h, --help           Show help
  --version            Show version
```

Defaults (applied by `--yes` and as fallbacks for any flag you don't set):

- Directory: `my-spectrum-app`
- Providers: `imessage` (first platform in the manifest)
- Package manager: detected from your shell, otherwise `bun`
- Install dependencies: yes
- Initialize git: yes
- Install Spectrum skill: yes

Examples:

```sh
# iMessage, no prompts, all defaults
bun create spectrum-project@latest --yes

# Terminal sandbox (dev TUI, no credentials)
bun create spectrum-project@latest my-app --platforms terminal

# iMessage + WhatsApp on pnpm, skip git
bun create spectrum-project@latest my-app --platforms imessage,whatsapp-business --pm pnpm --no-git

# Use an existing Spectrum Cloud project — no new project is created; its
# existing secret is read and written into the scaffold's .env
bun create spectrum-project@latest my-app --projectId proj_abc123
```

When `--projectId` is set, the CLI skips project creation, logs you in if
needed, and writes `PROJECT_ID` / `PROJECT_SECRET` into `.env`.

## Requirements

Bun 1.3+ or Node 20+.

## License

MIT
