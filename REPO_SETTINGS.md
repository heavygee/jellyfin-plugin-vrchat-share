# Repository settings (canonical record)

Snapshot of GitHub controls on `heavygee/jellyfin-plugin-vrchat-share`.
Update when settings change so hardening state is auditable from the tree.

**Last probe:** 2026-11-09 (post PR #7 merge + Tier H API runbook).

## Identity

| | |
|---|---|
| Owner | `heavygee` |
| `gh` CLI | `gh` (heavygee account) |
| Visibility | **public** |
| License | GPL-3.0 (`spdx_id: GPL-3.0` detected by GitHub) |

## Branch protection (`main`)

| Control | State (probed) |
|---------|----------------|
| Required status checks | **`ci`** only (`strict: false`) |
| Enforce admins | false (bypass stays available; do not use as routine) |
| Allow force pushes | false |
| Allow deletions | false |
| Allow auto-merge | true |
| Delete branch on merge | true |
| Squash merge title/body | PR_TITLE / PR_BODY |

Never bypass rulesets as routine; stop and ask before admin override.

## GitHub Advanced Security (free for public)

| Control | State (probed 2026-11-09) |
|---------|---------------------------|
| Secret scanning | enabled |
| Secret scanning push protection | enabled |
| CodeQL default setup | configured — languages: `actions`, `csharp`, `javascript`, `javascript-typescript`, `typescript`; schedule weekly |
| Code Quality | **unavailable** (REST 404) — skipped; not a merge blocker |
| Dependabot alerts | enabled (`PUT …/vulnerability-alerts`) |
| Dependabot security updates | enabled |
| Dependabot version updates | `.github/dependabot.yml` (nuget + github-actions, weekly, `cooldown.default-days: 7`) |
| Private vulnerability reporting | enabled |
| Dependency graph | on with Dependabot alerts |

## In-repo CI gates

`.github/workflows/ci.yml` (`name: CI`) runs:

| Job | Tool | Blocks merge |
|-----|------|---|
| `build` | `dotnet build` jf12 + plugin zip | yes |
| `secret-scan` | gitleaks (`gitleaks/gitleaks-action@v3`) | yes |
| `owasp-sast` | Semgrep `1.122.0` (OWASP + csharp + javascript + secrets + project rules + self-test) | yes |
| `security-audit` | `dotnet list package --vulnerable` (High/Critical) | yes |
| `ci` (aggregate) | sum of above (`if: always()`) | **required** for merge |
| `merge-on-green` | Dependabot / `automerge` label after green `ci` | auto |

Semgrep excludes `yaml.github-actions.security.github-actions-mutable-action-tag` so Dependabot can bump Actions major tags; supply-chain review is via Dependabot PRs + green `ci`.

Dependabot PRs auto-merge on green `ci` (embedded `merge-on-green`). Human/agent PRs need the `automerge` label for the same path.

## Release path

`.github/workflows/release.yml` on tag `v*`:

1. Verify tag matches `Directory.Build.props` `<Version>` (four-part or trimmed).
2. Build jf12 Release + pack `Jellyfin.Plugin.VrchatShare_12.0.0.zip`.
3. Cut a GitHub Release with the matching `CHANGELOG.md` section + zip asset.

No npm/PyPI publish. Catalog consumers use GitHub Releases + `manifest.json` on `main`.

## Pages / docs site (Tier E)

Deferred. README is the docs surface. Revisit MkDocs / Pages if the plugin needs a longer guide.

## Sponsorship

`.github/FUNDING.yml` → `github: [heavygee]`. **Operator step:** Settings → General → Features → **Sponsorships** (and the Set up sponsor button ritual if the sidebar stays blank).

## Social preview

`.github/social-preview.png` (1280×640) is committed. **Operator step:** Settings → General → Social preview → upload that file once (GitHub does not always auto-apply from `.github/`).

## Apply Tier H controls via `gh`

```bash
OWNER=heavygee REPO=jellyfin-plugin-vrchat-share
gh api -X PUT "repos/$OWNER/$REPO/vulnerability-alerts"
gh api -X PUT "repos/$OWNER/$REPO/automated-security-fixes"
gh api -X PUT "repos/$OWNER/$REPO/private-vulnerability-reporting"
gh api -X PATCH "repos/$OWNER/$REPO" --input - <<'EOF'
{"security_and_analysis":{
  "secret_scanning":{"status":"enabled"},
  "secret_scanning_push_protection":{"status":"enabled"},
  "dependabot_security_updates":{"status":"enabled"}
},
"allow_auto_merge":true,
"delete_branch_on_merge":true,
"allow_squash_merge":true,
"squash_merge_commit_title":"PR_TITLE",
"squash_merge_commit_message":"PR_BODY"}
EOF
gh api "repos/$OWNER/$REPO/languages"
gh api -X PATCH "repos/$OWNER/$REPO/code-scanning/default-setup" \
  -f state=configured -f 'languages[]=actions' -f 'languages[]=csharp' \
  -f 'languages[]=javascript-typescript'
# Code Quality: expected 404 on this repo (2026-11-09) — skip
gh api -X PUT "repos/$OWNER/$REPO/branches/main/protection" --input - <<'EOF'
{
  "required_status_checks": {"strict": false, "contexts": ["ci"]},
  "enforce_admins": false,
  "required_pull_request_reviews": null,
  "restrictions": null,
  "allow_force_pushes": false,
  "allow_deletions": false,
  "required_conversation_resolution": false
}
EOF
```
