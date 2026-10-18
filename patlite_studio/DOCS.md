# PATLITE Light Show Studio

## Install
1. Push this project to GitHub (the repository must be **public** so Home Assistant can clone it).
2. Replace every `REPLACE_ME` in `repository.yaml`, `patlite_studio/config.yaml` and `patlite_studio/build.yaml` with your GitHub user/repo.
3. In Home Assistant: **Settings → Add-ons → Add-on Store → ⋮ → Repositories**, add your repository URL.
4. Install **PATLITE Light Show Studio**, set `device_host` to the tower's IP, start it, and click **Open Web UI** (port 8099).

## How it talks to the tower
The add-on's own server sends HTTP GET requests straight to the tower, e.g.
`http://192.168.4.26/api/control?color=46091&buzzer=0`. No Node-RED is needed.
Command parameter names and buzzer values can be changed in **Device Settings**.

## Updating
Bump `version` in `config.yaml`, push, then **Rebuild** the add-on in Home Assistant.
