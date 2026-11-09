# Repository settings (canonical record)

Snapshot of GitHub controls on `heavygee/jellyfin-plugin-vrchat-share`.
Update when settings change so hardening state is auditable from the tree.

## Identity

| | |
|---|---|
| Owner | `heavygee` |
| `gh` CLI | `gh` (heavygee account) |
| Visibility | **public** |
| License | GPL-3.0-or-later (full text in `LICENSE`) |

## Branch protection (`main`)

**Target state** (apply via the `gh` block below **after** the first green aggregate `ci` on `main` — do not claim enabled until that probe returns 200):

- Require a pull request before merging
- Require status checks: **`ci`** (aggregate) only
- Require branches to be up to date before merging — **false** (avoids Dependabot rebase storms)
- Allow auto-merge
- Automatically delete head branches
- Restrict force pushes
- Never bypass rulesets as routine; stop and ask before admin override

## GitHub Advanced Security (free for public)

| Control | Target / how |
|---------|--------------|
| Secret scanning | enable via API after merge |
| Secret scanning push protection | enable via API after merge |
| CodeQL default setup | enable via API (`csharp`, `javascript-typescript`, `actions` after language probe) |
| Code Quality | try REST; document skip if 403 |
| Dependabot alerts | `PUT …/vulnerability-alerts` |
| Dependabot security updates | `PUT …/automated-security-fixes` |
| Dependabot version updates | `.github/dependabot.yml` (nuget + github-actions, weekly, `cooldown.default-days: 7`) |
| Private vulnerability reporting | `PUT …/private-vulnerability-reporting` |
| Dependency graph | usually on when Dependabot alerts are enabled |

Update this table with **probe results** (date + `gh` JSON snippets) once the API runbook below has been executed.

## In-repo CI gates

`.github/workflows/ci.yml` (`name: CI`) runs:

| Job | Tool | Blocks merge |
|-----|------|---|
| `build` | `dotnet build` jf12 + plugin zip | yes |
| `secret-scan` | gitleaks (`gitleaks/gitleaks-action@v3`) | yes |
| `owasp-sast` | Semgrep `1.122.0` (OWASP + csharp + javascript + secrets + project rules) | yes |
| `security-audit` | `dotnet list package --vulnerable` | yes |
| `ci` (aggregate) | sum of above (`if: always()`) | **required** for merge |
| `merge-on-green` | Dependabot / `automerge` label after green `ci` | auto |

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
# Probe languages before CodeQL configure — do not hardcode blind.
gh api "repos/$OWNER/$REPO/languages"
gh api -X PATCH "repos/$OWNER/$REPO/code-scanning/default-setup" \
  -f state=configured -f 'languages[]=actions' -f 'languages[]=csharp' \
  -f 'languages[]=javascript-typescript'
gh api -X PATCH "repos/$OWNER/$REPO/code-quality/setup" \
  -f state=configured -f 'languages[]=javascript-typescript' \
  -f 'languages[]=csharp' || true
```

Branch protection (after first green `ci`):

```bash
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
