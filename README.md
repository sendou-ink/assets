# sendou.ink assets

Static assets served by [sendou.ink](https://sendou.ink): badges, images, sounds,
icons, and Splatoon stage planner maps. Everything in [`assets/`](./assets) is
mirrored to a DigitalOcean Space on every push to `main` (see [Deployment](#deployment)).

## Layout

```
assets/
  badges/        badge animations (.gif)
  img/           general images, mostly .avif (+ some .png/.gif)
  planner-maps/  stage maps for the build planner (.png)
  sounds/        UI / notification sounds (.wav)
  svg/           icons (.svg)

planner-maps/        generated stage maps (source for assets/planner-maps)
planner-maps.js      script that renames raw map exports into the naming scheme
planner-maps-yaga.js variant of the above for a different input layout
```

Anything outside `assets/` is tooling/source and is **not** deployed.

## Planner maps

Raw map exports are dropped into an `input/` folder (gitignored) and normalized
into `<stageId>-<mode>-<type>.png` by the generator scripts:

```bash
node planner-maps.js        # reads input/,           writes planner-maps/
node planner-maps-yaga.js   # reads input/overhead/,  writes planner-maps-new/
```

- **stageId** — numeric id derived from the stage abbreviation (`ScG` → `0`, …).
- **mode** — game mode (`SZ`, `RM`, `CB`, …).
- **type** — map variant: `OVER` (overhead), `MINI` (minimap), `ITEMS`.

After generating, move/copy the results into `assets/planner-maps/` to ship them.

## Deployment

[`.github/workflows/deploy-assets.yml`](./.github/workflows/deploy-assets.yml)
syncs `assets/` to DigitalOcean Spaces using `s3cmd`.

- **Trigger:** push to `main` that touches `assets/**` (or the workflow file), or a
  manual run via the Actions tab ("Run workflow").
- **Sync:** `s3cmd sync --delete-removed` makes the Space an exact mirror of
  `assets/` — files deleted here are deleted in the Space. Uploads are
  content-addressed (size + md5), so unchanged files are skipped.
- **Content types:** `.avif` files are uploaded in a second pass with an explicit
  `image/avif` type, since s3cmd can't infer it from the extension.
- **Visibility:** objects are uploaded with a public-read ACL.

### Required repository configuration

Set these under **Settings → Secrets and variables → Actions**.

| Type     | Name                 | Example                        |
| -------- | -------------------- | ------------------------------ |
| Secret   | `SPACES_ACCESS_KEY`  | DigitalOcean Spaces access key |
| Secret   | `SPACES_SECRET_KEY`  | DigitalOcean Spaces secret key |
| Variable | `SPACES_ENDPOINT`    | `nyc3.digitaloceanspaces.com`  |
| Variable | `SPACES_BUCKET`      | Space (bucket) name            |
| Variable | `SPACES_PREFIX`      | optional path prefix, or empty |

The first deploy uploads the full asset set; later deploys only transfer what
changed.
