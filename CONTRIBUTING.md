# Contributing

Features and bugs require a GitHub Issue before implementation work (**no ticket, no workee**).

## Setup

- .NET 10 SDK (Jellyfin 12 / `jf12` target) or Docker `mcr.microsoft.com/dotnet/sdk:10.0`
- Optional: Jellyfin 12 + JavaScript Injector for local UI testing
- Optional security gates locally: Docker + `bash scripts/owasp-gate.sh`; [gitleaks](https://github.com/gitleaks/gitleaks) for staged scans

## Build

```bash
dotnet build Jellyfin.Plugin.VrchatShare -c Release -p:JellyfinTarget=jf12
```

## CI

Pull requests must pass the aggregate **`ci`** check (build, gitleaks, Semgrep OWASP, NuGet vulnerability audit). Do not bypass branch protection as routine - stop and ask before overriding.

Dependabot PRs auto-merge when `ci` is green. Human/agent PRs can opt in with the `automerge` label:

```bash
gh pr edit <n> --add-label automerge
```

## PR checklist

- [ ] Linked issue (`Fixes #N`)
- [ ] Conventional commit subject
- [ ] README / changelog updated when behaviour changes
- [ ] Manual smoke: item ⋮ → Share in VRChat opens `{base}/item/{id}`
- [ ] No production Lounge URLs or secrets in the tree
