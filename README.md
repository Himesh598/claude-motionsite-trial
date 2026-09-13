# claude-motionsite-trial

Cinematic one-page site: a single full-viewport sticky scene over a 500vh scroll
track, with the background video scrubbed by scroll position.

## Stack

Vite + React 18 + TypeScript + Tailwind CSS 3, `lucide-react` icons, `mp4box`
for WebCodecs frame extraction. `@` is aliased to `src`.

## Run

```bash
npm install
npm run dev      # dev server
npm run build    # typecheck + production build
npm run preview  # serve the build
```

## Scroll-video logic

`src/useVideoScrub.ts` maps scroll progress to video time, smoothed with an
exponential lerp (`LERP_TAU = 8`, snapping within `SNAP = 0.002`).

After `window.load` it fetches the mp4, parses it with MP4Box, decodes every
sample through `VideoDecoder`, and banks each frame as a webp blob (decode is
throttled by `LEAD` so it never outruns blob encoding). Frames near the playhead
are held as `ImageBitmap`s in an LRU of `LRU_MAX` entries and painted to a
1920×1080 canvas that fades in over the video on first paint.

Fallbacks: hardware decode failure retries once with
`hardwareAcceleration: 'prefer-software'`; a 60s watchdog, a missing
`VideoDecoder`, `prefers-reduced-motion`, or a failed fetch (the source needs
CORS) all revert to seeking `video.currentTime`, with the canvas hidden.
