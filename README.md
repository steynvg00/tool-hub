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

Publishing a new version is one command. Two helper scripts do the work:

- `npm run build:binary` — rebuilds the Python sidecar as a PyInstaller binary
  (`python-backend/dist/toolhub-backend/`), non-interactively. Run this whenever
  the Python backend changed so the new code ships in the app.
- `npm run release` — builds the binary, builds the app (typecheck + bundle),
  then packages and publishes to GitHub Releases. It runs
  `electron-builder --mac --publish always`, which needs a `GH_TOKEN` in the
  environment with permission to create releases on the configured repo.

### Release procedure (run after finishing a feature)

```bash
# 1. commit your changes
git add -A && git commit -m "Describe the feature"

# 2. bump the version + create a git tag (patch / minor / major)
npm version patch

# 3. build binary + app and publish to GitHub Releases (needs GH_TOKEN)
npm run release

# 4. push the commit and the new tag
git push --follow-tags
```

The app checks GitHub Releases for updates on startup (see `electron-updater`
wiring in `src/main/updater.ts`), downloads a newer version, and prompts the
user to restart to install.
