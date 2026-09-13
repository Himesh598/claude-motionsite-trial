import { useEffect, useRef, useState } from 'react';
import { createFile, DataStream } from 'mp4box';
import type { MP4ArrayBuffer, MP4File, MP4Info, MP4MediaTrack, MP4Sample } from 'mp4box';

const LERP_TAU = 8;
const SNAP = 0.002;
const LRU_MAX = 24;
const LEAD = 24;
const WATCHDOG = 60000;

type BankFrame = { ts: number; blob: Blob };

const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * Drives a <video> from scroll position. Decoded frames are banked as webp blobs
 * so the canvas can scrub smoothly; video.currentTime seeking is the fallback.
 */
export function useVideoScrub(videoSrc: string) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [scrollProgress, setScrollProgress] = useState(0);
  const [canvasLive, setCanvasLive] = useState(false);

  const bank = useRef<BankFrame[]>([]);
  const lru = useRef<Map<number, ImageBitmap | null>>(new Map());
  const current = useRef(0);
  const target = useRef(0);
  const ready = useRef(false);
  const reverted = useRef(false);
  const painted = useRef(false);
  const building = useRef(false);
  const dur = useRef(0);
  const span = useRef(1);
  const seeking = useRef(false);
  const lastDrawn = useRef(-1);

  // --- scroll span -----------------------------------------------------------
  useEffect(() => {
    const measure = () => {
      const el = containerRef.current;
      span.current = el ? Math.max(1, el.offsetHeight - window.innerHeight) : 1;
    };
    measure();
    window.addEventListener('resize', measure);
    window.addEventListener('orientationchange', measure);
    return () => {
      window.removeEventListener('resize', measure);
      window.removeEventListener('orientationchange', measure);
    };
  }, []);

  // --- duration + seek state from the video element --------------------------
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const onMeta = () => {
      if (Number.isFinite(video.duration) && video.duration > 0) dur.current = video.duration;
    };
    const onSeeking = () => {
      seeking.current = true;
    };
    const onSeeked = () => {
      seeking.current = false;
    };
    video.addEventListener('loadedmetadata', onMeta);
    video.addEventListener('seeking', onSeeking);
    video.addEventListener('seeked', onSeeked);
    if (video.readyState >= 1) onMeta();
    return () => {
      video.removeEventListener('loadedmetadata', onMeta);
      video.removeEventListener('seeking', onSeeking);
      video.removeEventListener('seeked', onSeeked);
    };
  }, []);

  // --- frame bank helpers ----------------------------------------------------
  const nearestIndex = (t: number) => {
    const frames = bank.current;
    if (frames.length === 0) return -1;
    const us = t * 1e6;
    let lo = 0;
    let hi = frames.length - 1;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (frames[mid].ts < us) lo = mid + 1;
      else hi = mid;
    }
    if (lo > 0 && Math.abs(frames[lo - 1].ts - us) <= Math.abs(frames[lo].ts - us)) return lo - 1;
    return lo;
  };

  const warmLRU = (i: number) => {
    const frames = bank.current;
    const cache = lru.current;
    for (let j = i - 1; j <= i + 2; j++) {
      if (j < 0 || j >= frames.length || cache.has(j)) continue;
      cache.set(j, null);
      createImageBitmap(frames[j].blob)
        .then((bmp) => {
          if (cache.has(j) && cache.get(j) === null) cache.set(j, bmp);
          else bmp.close();
        })
        .catch(() => {
          cache.delete(j);
        });
    }
    while (cache.size > LRU_MAX) {
      const oldest = cache.keys().next();
      if (oldest.done) break;
      const key = oldest.value;
      if (key >= i - 1 && key <= i + 2) {
        // keep the live window: refresh its position instead of evicting it
        const bmp = cache.get(key) ?? null;
        cache.delete(key);
        cache.set(key, bmp);
        continue;
      }
      cache.get(key)?.close();
      cache.delete(key);
    }
  };

  const drawFrame = (t: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const i = nearestIndex(t);
    if (i < 0) return;
    warmLRU(i);
    const bmp = lru.current.get(i);
    if (!bmp) return;
    if (lastDrawn.current === i) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(bmp, 0, 0, canvas.width, canvas.height);
    lastDrawn.current = i;
    // refresh recency
    lru.current.delete(i);
    lru.current.set(i, bmp);
    if (!painted.current) {
      painted.current = true;
      setCanvasLive(true);
    }
  };

  const revert = () => {
    if (reverted.current) return;
    reverted.current = true;
    ready.current = false;
    painted.current = false;
    setCanvasLive(false);
    lru.current.forEach((bmp) => bmp?.close());
    lru.current.clear();
    bank.current = [];
  };

  // --- rAF loop --------------------------------------------------------------
  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const reduce = prefersReducedMotion();

    const getProgress = () => {
      const denom = span.current;
      const p = window.scrollY / denom;
      return Math.min(1, Math.max(0, p));
    };

    const tick = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;

      const p = getProgress();
      setScrollProgress(p);

      if (dur.current > 0) {
        target.current = p * dur.current;
        if (reduce) {
          current.current = target.current;
        } else {
          current.current += (target.current - current.current) * (1 - Math.exp(-dt * LERP_TAU));
          if (Math.abs(target.current - current.current) < SNAP) current.current = target.current;
        }

        if (ready.current) {
          drawFrame(current.current);
        } else {
          const video = videoRef.current;
          if (video && !seeking.current && Math.abs(video.currentTime - current.current) > 0.01) {
            video.currentTime = current.current;
          }
        }
      }

      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  // --- frame bank build ------------------------------------------------------
  useEffect(() => {
    if (prefersReducedMotion()) return;
    if (typeof window === 'undefined' || typeof VideoDecoder === 'undefined') return;

    let cancelled = false;
    let watchdog = 0;
    let activeDecoder: VideoDecoder | null = null;

    const decodeAll = (buffer: ArrayBuffer, software: boolean) =>
      new Promise<BankFrame[]>((resolve, reject) => {
        const frames: BankFrame[] = [];
        const file: MP4File = createFile();
        const off = document.createElement('canvas');
        const octx = off.getContext('2d');
        if (!octx) {
          reject(new Error('no 2d context'));
          return;
        }

        let decoder: VideoDecoder | null = null;
        const pendingSamples: MP4Sample[] = [];
        const pendingFrames: VideoFrame[] = [];
        let sent = 0;
        let encoded = 0;
        let allSamples = false;
        let flushed = false;
        let settled = false;
        let encodeChain: Promise<void> = Promise.resolve();

        const fail = (err: unknown) => {
          if (settled) return;
          settled = true;
          try {
            if (decoder && decoder.state !== 'closed') decoder.close();
          } catch {
            /* already gone */
          }
          pendingFrames.forEach((f) => f.close());
          reject(err instanceof Error ? err : new Error(String(err)));
        };

        const finish = () => {
          if (settled) return;
          settled = true;
          try {
            if (decoder && decoder.state !== 'closed') decoder.close();
          } catch {
            /* already gone */
          }
          resolve(frames);
        };

        const pump = () => {
          if (settled || !decoder) return;
          // LEAD throttles decode so it never outruns blob encoding
          while (pendingSamples.length > 0 && sent - encoded < LEAD) {
            const s = pendingSamples.shift()!;
            try {
              decoder.decode(
                new EncodedVideoChunk({
                  type: s.is_sync ? 'key' : 'delta',
                  timestamp: (s.cts * 1e6) / s.timescale,
                  duration: (s.duration * 1e6) / s.timescale,
                  data: s.data,
                }),
              );
            } catch (err) {
              fail(err);
              return;
            }
            sent++;
          }
          if (allSamples && pendingSamples.length === 0 && !flushed) {
            flushed = true;
            decoder
              .flush()
              .then(() => encodeChain)
              .then(finish)
              .catch(fail);
          }
        };

        // frames are encoded one at a time so the offscreen canvas is never
        // overwritten while a toBlob() of the previous frame is still pending
        const encodeFrame = async () => {
          const frame = pendingFrames.shift();
          if (!frame) return;
          const ts = frame.timestamp;
          off.width = frame.displayWidth;
          off.height = frame.displayHeight;
          octx.drawImage(frame, 0, 0);
          frame.close();
          const blob = await new Promise<Blob | null>((res) => off.toBlob(res, 'image/webp', 0.82));
          if (blob) frames.push({ ts, blob });
          encoded++;
          pump();
        };

        file.onError = (err) => fail(new Error(err));

        file.onSamples = (_id, _user, samples) => {
          for (const s of samples) pendingSamples.push(s);
          pump();
        };

        file.onReady = (info: MP4Info) => {
          const track: MP4MediaTrack | undefined =
            info.videoTracks?.[0] ?? info.tracks.find((t) => !!t.video || t.type === 'video');
          if (!track) {
            fail(new Error('no video track'));
            return;
          }
          if (info.duration > 0 && info.timescale > 0) {
            dur.current = info.duration / info.timescale;
          }

          let description: Uint8Array | undefined;
          try {
            const trak = file.getTrackById(track.id);
            for (const entry of trak.mdia.minf.stbl.stsd.entries) {
              const box = entry.avcC ?? entry.hvcC ?? entry.vpcC ?? entry.av1C;
              if (box) {
                const stream = new DataStream(undefined, 0, DataStream.BIG_ENDIAN);
                box.write(stream);
                description = new Uint8Array(stream.buffer.slice(8)); // strip box header
                break;
              }
            }
          } catch (err) {
            fail(err);
            return;
          }

          decoder = new VideoDecoder({
            output: (frame) => {
              pendingFrames.push(frame);
              encodeChain = encodeChain.then(encodeFrame);
            },
            error: fail,
          });
          activeDecoder = decoder;

          const config: VideoDecoderConfig = {
            codec: track.codec,
            codedWidth: track.video?.width ?? track.track_width,
            codedHeight: track.video?.height ?? track.track_height,
            description,
          };
          if (software) config.hardwareAcceleration = 'prefer-software';

          try {
            decoder.configure(config);
          } catch (err) {
            fail(err);
            return;
          }

          file.setExtractionOptions(track.id, null, { nbSamples: 100 });
          file.start();
          allSamples = true;
          pump();
        };

        const mp4Buffer = buffer.slice(0) as MP4ArrayBuffer;
        mp4Buffer.fileStart = 0;
        try {
          file.appendBuffer(mp4Buffer);
          file.flush();
        } catch (err) {
          fail(err);
        }
      });

    const build = async () => {
      if (building.current) return;
      building.current = true;
      watchdog = window.setTimeout(() => {
        if (!ready.current) revert();
      }, WATCHDOG);

      try {
        // needs CloudFront CORS; the video element keeps working if this fails
        const res = await fetch(videoSrc);
        if (!res.ok) throw new Error(`fetch failed: ${res.status}`);
        const buffer = await res.arrayBuffer();
        if (cancelled) return;

        let frames: BankFrame[];
        try {
          frames = await decodeAll(buffer, false);
        } catch {
          if (cancelled) return;
          frames = await decodeAll(buffer, true);
        }
        if (cancelled || reverted.current) return;
        if (frames.length === 0) throw new Error('no frames decoded');

        frames.sort((a, b) => a.ts - b.ts);
        bank.current = frames;
        ready.current = true;
      } catch {
        revert();
      } finally {
        window.clearTimeout(watchdog);
      }
    };

    const start = () => void build();
    if (document.readyState === 'complete') start();
    else window.addEventListener('load', start, { once: true });

    return () => {
      cancelled = true;
      window.clearTimeout(watchdog);
      window.removeEventListener('load', start);
      try {
        if (activeDecoder && activeDecoder.state !== 'closed') activeDecoder.close();
      } catch {
        /* already gone */
      }
      lru.current.forEach((bmp) => bmp?.close());
      lru.current.clear();
    };
  }, [videoSrc]);

  return { containerRef, videoRef, canvasRef, scrollProgress, canvasLive };
}
