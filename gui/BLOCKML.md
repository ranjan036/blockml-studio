# BlockML Studio changes to TurboWarp's scratch-gui

This folder is TurboWarp's `scratch-gui` (GPL-3.0), imported with
`git subtree` from `https://github.com/TurboWarp/scratch-gui` branch
`develop` (first import: commit `25c11c6`). Every change we make is marked
with a `blockml:` comment so it's easy to find when merging TurboWarp updates.

## Changes (S1)

| Area | Change | Why |
|---|---|---|
| `src/lib/brand.js` | App name "BlockML Studio" | Branding |
| `src/lib/themes/index.js` | Default accent blue | BlockML colour |
| `static/` icons, `manifest.webmanifest`, `src/playground/index.ejs`, `webpack.config.js` | Our icon, name, page titles and description | Branding (no TurboWarp logo) |
| `src/components/menu-bar/` | "BlockML Studio" name at the left; "BlockML (data science)" link replaces TurboWarp's feedback button; error-report links go to our GitHub issues; no TurboWarp news banner | Branding, support |
| `src/playground/render-gui.jsx` | No cloud variable server; no "See Project Page" button | Privacy (clouddata.turbowarp.org); not a Scratch-website client |
| `src/lib/project-fetcher-hoc.jsx` | Opening scratch.mit.edu projects by ID is disabled (it goes through trampoline.turbowarp.org); `?project_url=` still works | Privacy, no dependency on TurboWarp's servers |
| `src/playground/render-interface.jsx` | No Packager integration, project metadata fetching, featured projects or project-ID box; homepage text and footer links are ours | Same |
| `src/containers/extension-library.jsx`, `src/lib/libraries/extensions/index.jsx` | No online extension gallery; Face Sensing and Custom Extension removed (all standard Scratch extensions stay) | Privacy and safety for students; our own AI extensions come in S2+ |
| `src/playground/credits/credits.jsx` | Adds who makes BlockML Studio and the source link; keeps all TurboWarp and Scratch credits | Credit and GPL source offer |
| `static/privacy.html` | Our privacy page | Accurate for this site |
| `src/containers/tw-security-manager.jsx` (S2) | Trust this site's `/extensions/` (and the production site's) instead of extensions.turbowarp.org | Our AI extensions run unsandboxed; outside extensions ask first |
| `src/lib/libraries/extensions/index.jsx`, `blockml/*.svg`, `src/lib/libraries/tw-extension-tags.js` (S2) | Face and Hand & Pose at the top of the extension library, with an "AI" filter | Our AI extensions |
| `.gitignore` (S2) | `static/extensions/`, `static/starters/` are build output from `../extensions` | Build |
| `vercel.json` (here and at the repo root) | Build and hosting settings for studio.blockml.codeai.ltd. The root copy builds `gui/` when the Vercel project's Root Directory is the repo root; this copy is used when it is `gui`. Keep them in sync. | Deployment |

Still contacted by the editor: Scratch's asset server (`cdn.assets.scratch.mit.edu`)
for the sprite/costume/backdrop/sound libraries, and TurboWarp's server for
contributor pictures on the Credits page. Everything else, including the AI extensions and their models (`/extensions/`), is served from our site.

## Build

Node 22 or 24. From this folder:

```
npm ci
npm start                                                   # dev server on http://localhost:8601/
NODE_ENV=production ENABLE_SERVICE_WORKER=1 npm run build   # -> build/
```

## Pulling in TurboWarp updates

From the repository root:

```
git fetch --depth=1 https://github.com/TurboWarp/scratch-gui.git develop
git subtree merge --prefix=gui FETCH_HEAD --squash
```

Resolve conflicts around the `blockml:` comments, rebuild, and check the
editor still loads the default project and opens a `.sb3`.
