# Changelog

## Unreleased

- Repo hygiene: perfect-github public baseline (aggregate `ci`, gitleaks, Semgrep OWASP, Dependabot, release.yml, full GPL-3.0 LICENSE)

## 0.1.4.0 — 2026-11-08

- Remove any production BaseUrl from published defaults, config copy, and client fallback
- Admin must set BaseUrl; deeplink no-ops with a console warning until configured

## 0.1.3.0 — 2026-11-08

- Catalog / dashboard **icon.png** + **thumb.png** (lounge cyan + violet geometric bridge motif)
- Sibling drop assets for vrchat-jellyfin under `assets/for-vrchat-jellyfin/` (og, favicon, icons)

## 0.1.2.0 — 2026-11-08

- Remove the detail-page bordered **VRChat** text button (overflow menu only)
- Keeps modern MoreCommands capture + `#/details?id=` resolution

## 0.1.1.0 — 2026-11-08

- Fix: JF12 modern `.btnMoreCommands` never set item context (legacy `#itemDetailPage` only), so **Share in VRChat** never appeared and stock Share/`navigator.share` was the only option
- Resolve item id from `#/details?id=`

## 0.1.0.0 — 2026-11-08

- Initial release: **Share in VRChat** item menu action
- Configurable vrchat-jellyfin base URL (default Lounge prod)
- Soft-registers client script with JavaScript Injector when present
- Standalone JS path for Injector-only installs
