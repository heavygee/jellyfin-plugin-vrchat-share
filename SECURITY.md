# Security Policy

## Supported versions

Only the latest release published on [GitHub Releases](https://github.com/heavygee/jellyfin-plugin-vrchat-share/releases) is supported for security fixes.

## Reporting a vulnerability

Report vulnerabilities **privately** via [GitHub Security Advisories](https://github.com/heavygee/jellyfin-plugin-vrchat-share/security/advisories/new) on this repository.

Do **not** open a public issue for security reports.

## Scope notes

- This plugin stores a **Base URL** for a vrchat-jellyfin origin (operator-configured). Do not commit production Lounge URLs or tokens into the public tree.
- Client injection JS must never log Jellyfin auth headers or API keys.
- CI runs gitleaks (`secret-scan`) and Semgrep OWASP (`owasp-sast`) on every PR.
