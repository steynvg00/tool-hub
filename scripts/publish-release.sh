#!/usr/bin/env bash
#
# Deterministic, single-shot publisher for macOS releases.
#
# Why this exists: electron-builder's built-in GitHub publisher spawns two
# concurrent upload workers. They race and regularly leave TWO releases for the
# same tag, with the five assets split across them and inconsistently named
# (see git history around 1.0.3/1.0.4). This script sidesteps that entirely:
# electron-builder builds with `--publish never`, and we upload here exactly
# once, in a single sequential process, with the gh CLI.
#
# Usage:
#   bash scripts/publish-release.sh            # create/complete the release
#   DRY_RUN=1 bash scripts/publish-release.sh  # validate + print, upload nothing
#
# Preconditions:
#   - gh CLI authenticated (GH_TOKEN / GITHUB_TOKEN in env, or `gh auth login`).
#   - The git tag vX.Y.Z already exists on the remote (push it BEFORE releasing;
#     `gh release create --verify-tag` refuses to invent it).
#   - A completed `electron-builder --mac --publish never` build in dist/.
#
set -euo pipefail
shopt -s nullglob

REPO="steynvg00/tool-hub"
DIST="dist"
VERSION="$(node -p "require('./package.json').version")"
TAG="v${VERSION}"
DRY_RUN="${DRY_RUN:-0}"

die() { echo "publish-release: $*" >&2; exit 1; }

# Resolve a glob to its single match, or fail loudly.
one() {
  local desc="$1"; shift
  local matches=( "$@" )
  [[ ${#matches[@]} -eq 1 ]] ||
    die "expected exactly one ${desc} in ${DIST}/ for ${VERSION}, found ${#matches[@]} (did the --publish never build run?)"
  printf '%s' "${matches[0]}"
}

# --- Locate the five release artifacts ---------------------------------------
dmg="$(one 'dmg' "${DIST}/"*"${VERSION}.dmg")"
dmg_map="$(one 'dmg blockmap' "${DIST}/"*"${VERSION}.dmg.blockmap")"
zip="$(one 'mac zip' "${DIST}/"*"${VERSION}-mac.zip")"
zip_map="$(one 'mac zip blockmap' "${DIST}/"*"${VERSION}-mac.zip.blockmap")"
yml="${DIST}/latest-mac.yml"
[[ -f "$yml" ]] || die "missing artifact: ${yml}"

# --- Stage assets under the exact names the manifest expects -----------------
# latest-mac.yml references the zip with spaces replaced by dashes
# (electron-builder's url sanitisation, because productName is "Tool Hub"). But
# when GitHub derives an asset name from a filename it turns spaces into DOTS.
# So we upload from names that already use dashes, guaranteeing every asset name
# matches the manifest url exactly. Hard links are instant and use no extra
# disk (same filesystem as dist/).
stage="$(mktemp -d "${DIST}/.publish-stage-XXXXXX")"
trap 'rm -rf "$stage"' EXIT

stage_asset() {
  local src="$1" name
  name="$(basename "$src")"; name="${name// /-}"
  ln "$src" "${stage}/${name}"
  printf '%s' "${stage}/${name}"
}

assets=()
for src in "$dmg" "$dmg_map" "$zip" "$zip_map" "$yml"; do
  assets+=( "$(stage_asset "$src")" )
done

echo "publish-release: repo=${REPO} tag=${TAG}"
echo "publish-release: assets to upload:"
for a in "${assets[@]}"; do printf '  - %s\n' "$(basename "$a")"; done

release_exists() { gh release view "$TAG" --repo "$REPO" >/dev/null 2>&1; }

if [[ "$DRY_RUN" == "1" ]]; then
  if release_exists; then
    echo "publish-release: [dry-run] release ${TAG} exists -> would 'gh release upload --clobber'"
  else
    echo "publish-release: [dry-run] release ${TAG} absent -> would 'gh release create --verify-tag'"
  fi
  echo "publish-release: [dry-run] no changes made."
  exit 0
fi

# --- Publish exactly once ----------------------------------------------------
if release_exists; then
  echo "publish-release: release ${TAG} exists -> uploading assets (clobber)"
  gh release upload "$TAG" --repo "$REPO" --clobber "${assets[@]}"
else
  echo "publish-release: creating release ${TAG}"
  gh release create "$TAG" --repo "$REPO" --verify-tag \
    --title "$VERSION" --notes "Tool Hub ${VERSION}" "${assets[@]}"
fi

# --- Verify: exactly one release for the tag, all five assets ----------------
count="$(gh api "repos/${REPO}/releases" --jq "[.[] | select(.tag_name==\"${TAG}\")] | length")"
[[ "$count" == "1" ]] || die "expected exactly 1 ${TAG} release, found ${count}"
n_assets="$(gh api "repos/${REPO}/releases/tags/${TAG}" --jq '.assets | length')"
[[ "$n_assets" == "5" ]] || die "expected 5 assets on ${TAG}, found ${n_assets}"

echo "publish-release: OK — 1 published release, ${n_assets} assets:"
gh api "repos/${REPO}/releases/tags/${TAG}" --jq '.assets[] | "  \(.name)  \(.size)"'
