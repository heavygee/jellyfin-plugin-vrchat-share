# jellyfin-plugin-vrchat-share

Jellyfin plugin that adds **Share in VRChat** to the item hamburger / context menu.

Opens a configurable [vrchat-jellyfin](https://github.com/introVRt-Lounge/vrchat-jellyfin) deeplink:

```text
{BaseUrl}/item/{jellyfinItemId}
```

Default base URL: `https://vrchat.introvrtlounge.com`

Paired contract (Movie/Episode → mint modal; Series → `/tvshow/:id`; Season → `/season/:id`) lives in vrchat-jellyfin.

## Requirements

- Jellyfin **12** (targetAbi `12.0.0.0`)
- Recommended: [JavaScript Injector](https://github.com/n00bcodr/Jellyfin-JavaScript-Injector) + [File Transformation](https://github.com/IAmParadox27/jellyfin-plugin-file-transformation) so the client hook injects cleanly

## Install (catalog / zip)

1. Download the latest `Jellyfin.Plugin.VrchatShare_12.0.0.zip` from [Releases](https://github.com/heavygee/jellyfin-plugin-vrchat-share/releases).
2. Dashboard → Plugins → Catalog → ⚙️ → add repository:

   ```text
   https://raw.githubusercontent.com/heavygee/jellyfin-plugin-vrchat-share/main/manifest.json
   ```

3. Install **VRChat Share**, restart Jellyfin.
4. Dashboard → Plugins → **VRChat Share** → set base URL if needed → Save.
5. Hard-refresh the web UI. Open any Movie/Episode/Series/Season ⋮ menu → **Share in VRChat**.

## Install (JS Injector only, no DLL)

Useful for a quick estate smoke test while the plugin zip builds:

1. JS Injector → Add Script → name `VRChat Share`
2. Paste contents of [`Jellyfin.Plugin.VrchatShare/Web/vrchat-share.js`](Jellyfin.Plugin.VrchatShare/Web/vrchat-share.js)
3. Optional boot stub above the script:

   ```js
   window.__VRCHAT_SHARE_BOOT__ = {
     enabled: true,
     baseUrl: 'https://vrchat.introvrtlounge.com',
     openInNewTab: true
   };
   ```

4. Save → hard-refresh.

## Brand / images

Shared lounge motif with [vrchat-jellyfin](https://github.com/introVRt-Lounge/vrchat-jellyfin): dark `#0b0b10`, cyan neon `#00e5ff`, violet bridge accent `#AA5CC3`.

| Asset | Path |
|-------|------|
| Plugin catalog icon | `Jellyfin.Plugin.VrchatShare/icon.png` |
| Plugin wide thumb | `Jellyfin.Plugin.VrchatShare/thumb.png` |
| Drop for vrchat-jellyfin (OG/favicon) | `assets/for-vrchat-jellyfin/` |

## Build

```bash
docker run --rm -v "$PWD":/src -w /src/Jellyfin.Plugin.VrchatShare \
  mcr.microsoft.com/dotnet/sdk:10.0 \
  dotnet build -c Release -p:JellyfinTarget=jf12
```

Zip `Jellyfin.Plugin.VrchatShare.dll` + `icon.png` (+ optional `thumb.png`) or use the GitHub Actions release workflow.

## Deeplink contract

| Jellyfin type | vrchat-jellyfin behaviour |
|---------------|---------------------------|
| Movie / Episode | Open mint UI for that item |
| Series | Navigate `/tvshow/:id` |
| Season | Navigate `/season/:id` |

Auth: browser already holds Cloudflare Access cookies for the Lounge UI; the plugin only `window.open`s the URL.

## License

GPL-3.0 (same family as most Jellyfin plugins).
