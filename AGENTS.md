<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Architecture
- Show logic lives in `src/lib/show/` (types, pure engine, templates, studio store); keep the engine pure so it stays testable and reusable by preview and hardware compile.
- Hardware I/O: browser -> same-origin relay `src/routes/api/device.ts` -> PATLITE over HTTP GET; encoding lives only in `src/lib/device/patlite.ts` and is settings-driven because the device API must be verified per manual. No Node-RED.
- Deployment target is a Home Assistant add-on (`repository.yaml` + `patlite_studio/`) that clones the repo and builds with `NITRO_PRESET=node-server`, because the relay must run on the user's LAN.
- Persistence is localStorage with a versioned show schema (`patlite-show` v1) so it can migrate to a database later.
