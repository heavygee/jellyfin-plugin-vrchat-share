# Changelog

## 0.1.1.0 — 2026-11-08

- Fix: JF12 modern `.btnMoreCommands` never set item context (legacy `#itemDetailPage` only), so **Share in VRChat** never appeared and stock Share/`navigator.share` was the only option
- Resolve item id from `#/details?id=`
- Add a visible **VRChat** button next to ⋮ on detail pages

## 0.1.0.0 — 2026-11-08

- Initial release: **Share in VRChat** item menu action
- Configurable vrchat-jellyfin base URL (default Lounge prod)
- Soft-registers client script with JavaScript Injector when present
- Standalone JS path for Injector-only installs
