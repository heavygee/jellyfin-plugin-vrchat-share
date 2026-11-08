# Contributing

Features and bugs require a GitHub Issue before implementation work.

## Setup

- .NET 10 SDK (Jellyfin 12 / `jf12` target) or Docker `mcr.microsoft.com/dotnet/sdk:10.0`
- Optional: Jellyfin 12 + JavaScript Injector for local UI testing

## Build

```bash
dotnet build Jellyfin.Plugin.VrchatShare -c Release -p:JellyfinTarget=jf12
```

## PR checklist

- [ ] Linked issue (`Fixes #N`)
- [ ] Conventional commit subject
- [ ] README / changelog updated when behaviour changes
- [ ] Manual smoke: item ⋮ → Share in VRChat opens `{base}/item/{id}`
