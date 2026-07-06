# Tool Hub

An Electron application with React and TypeScript. The image/file processing
runs in a bundled Python sidecar (FastAPI), shipped as a self-contained
PyInstaller binary.

## Recommended IDE Setup

- [VSCode](https://code.visualstudio.com/) + [ESLint](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint) + [Prettier](https://marketplace.visualstudio.com/items?itemName=esbenp.prettier-vscode)

## Project Setup

### Install

```bash
$ npm install
```

### Development

```bash
$ npm run dev
```

### Build

```bash
# For windows
$ npm run build:win

# For macOS
$ npm run build:mac

# For Linux
$ npm run build:linux
```

## Releasing

Publishing a new version is one command. The helper scripts do the work:

- `npm run build:binary` — rebuilds the Python sidecar as a PyInstaller binary
  (`python-backend/dist/toolhub-backend/`), non-interactively. Run this whenever
  the Python backend changed so the new code ships in the app.
- `npm run release` — builds the binary, builds the app (typecheck + bundle),
  packages the macOS artifacts with `electron-builder --mac --publish never`
  (**build only, no upload**), then publishes them in a single deterministic
  step via `npm run publish:github`.
- `npm run publish:github` — runs `scripts/publish-release.sh`, which uploads
  the five `dist/` artifacts (`.dmg`, `.dmg.blockmap`, `-mac.zip`,
  `-mac.zip.blockmap`, `latest-mac.yml`) to the release for the current tag with
  the `gh` CLI, then verifies there is exactly one release with all five assets.
  Needs `GH_TOKEN` / `GITHUB_TOKEN` in the environment (or `gh auth login`).

> **Why not `electron-builder --publish always`?** Its GitHub publisher spawns
> two concurrent upload workers that race and regularly leave *two* releases for
> the same tag, with the assets split across them and inconsistently named. The
> `--publish never` + single sequential `gh` upload removes the race entirely,
> so no manual cleanup is ever needed. Dry-run the publish step without
> uploading anything with `DRY_RUN=1 npm run publish:github`.

### Release procedure (run after finishing a feature)

```bash
# 1. commit your changes
git add -A && git commit -m "Describe the feature"

# 2. bump the version + create a git tag (patch / minor / major)
npm version patch

# 3. push the commit and the tag FIRST — the publish step verifies the tag
#    already exists on the remote (gh release create --verify-tag), and a
#    non-draft release (releaseType: release) can't be created without it.
git push --follow-tags

# 4. build binary + app, then publish to GitHub Releases (needs GH_TOKEN)
npm run release
```

The app checks GitHub Releases for updates on startup and from the manual
"check for updates" action (see `electron-updater` wiring in
`src/main/updater.ts`). Because the app isn't code-signed, it does **not**
self-install; on finding a newer version it prompts the user to open the release
page and install the new `.dmg` by hand.
