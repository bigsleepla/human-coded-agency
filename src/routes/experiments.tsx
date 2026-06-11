import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef } from "react";
import { getQuoteOfTheDay } from "@/lib/quotes.functions";

export const Route = createFileRoute("/experiments")({
  component: ExperimentsPage,
});

// Each character is a droplet of water. Together, their pairwise
// interactions (repulsion + viscosity + cohesion back to a slowly drifting
// home) cause them to behave like a fluid body — a cloud.
type Tendril = {
  // Anchor point on the cloud body where the strand roots.
  rootX: number;
  rootY: number;
  // Position along the strand, 0 at the root, 1 at the tip.
  t: number;
  // Strand-wide identifier so droplets on the same strand share a wave.
  strand: number;
  // Length of this strand (px) and lateral wave parameters.
  length: number;
  waveFreq: number;
  wavePhase: number;
  waveAmp: number;
};

type Droplet = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  // Home offset relative to its parent cloud's anchor — gives the cloud
  // its overall silhouette while letting droplets jostle freely. For
  // tendril droplets this is recomputed each frame from `tendril`.
  hx: number;
  hy: number;
  cloud: number; // index of parent cloud
  char: string;
  size: number;
  alpha: number;
  rot: number;
  rotVel: number;
  edge: number; // 0 = core, 1 = outer fringe — loosens cohesion + fades alpha
  tendril?: Tendril;
  // Rain droplets break away from the cloud and free-fall with gravity,
  // steering toward a target slot in the laid-out quote at the bottom of
  // the page. Once they reach the slot they settle in place.
  falling?: boolean;
  baseAlpha?: number;
  targetX?: number;
  targetY?: number;
  settled?: boolean;
  quoteGlyph?: boolean;
};

type Cloud = {
  ax: number; // anchor x (drifts with wind)
  ay: number; // anchor y
  vx: number; // wind velocity
  vy: number;
  radius: number; // for wrap bookkeeping
  slowed: boolean; // true once cloud has blown into ~40% of the page
  rainIndex: number; // next character of the quote to drop
  rainTimer: number; // seconds accumulator for drop cadence
};


const CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

function seedCloud(
  cloudIndex: number,
  cloud: Cloud,
  droplets: Droplet[],
  scale: number,
) {
  // Build the silhouette out of a few overlapping metaball-ish blobs.
  const blobCount = 3 + Math.floor(Math.random() * 3);
  const blobs: { x: number; y: number; r: number; w: number }[] = [];
  for (let i = 0; i < blobCount; i++) {
    blobs.push({
      x: (Math.random() - 0.5) * 280 * scale,
      y: (Math.random() - 0.5) * 70 * scale,
      r: (80 + Math.random() * 90) * scale,
      w: 0.5 + Math.random() * 0.6,
    });
  }
  const totalW = blobs.reduce((s, b) => s + b.w, 0);
  const count = Math.floor((90 + Math.random() * 60) * scale);

  let maxR = 0;
  for (let i = 0; i < count; i++) {
    let r = Math.random() * totalW;
    let chosen = blobs[0];
    for (const b of blobs) {
      r -= b.w;
      if (r <= 0) {
        chosen = b;
        break;
      }
    }
    // Bias toward edge to give a fuzzier, more diffuse silhouette.
    const u = Math.sqrt(Math.random());
    const radius = u * chosen.r;
    const angle = Math.random() * Math.PI * 2;
    const hx = chosen.x + Math.cos(angle) * radius;
    const hy = chosen.y + Math.sin(angle) * radius * 0.65;

    const distFromBlob = radius / chosen.r; // 0 center .. 1 edge
    const edge = Math.min(1, distFromBlob);
    // Sharper falloff at the perimeter so edges feel like vapor.
    const alpha = Math.pow(1 - edge, 1.6) * (0.4 + chosen.w * 0.55) + 0.05;

    const rabs = Math.hypot(hx, hy);
    if (rabs > maxR) maxR = rabs;

    droplets.push({
      x: cloud.ax + hx,
      y: cloud.ay + hy,
      vx: 0,
      vy: 0,
      hx,
      hy,
      cloud: cloudIndex,
      char: CHARS[Math.floor(Math.random() * CHARS.length)],
      size: (20 + Math.random() * 26) * scale,
      alpha: Math.min(0.9, Math.max(0.06, alpha)),
      rot: (Math.random() - 0.5) * Math.PI,
      rotVel: (Math.random() - 0.5) * 0.4,
      edge,
    });
  }
  cloud.radius = maxR + 60 * scale;

  // Seed 2-4 long tendrils per cloud. Each is a chain of droplets that
  // anchor at a point on the cloud body and trail behind the cloud (the
  // strand direction is computed at runtime from the cloud's velocity).
  const strandCount = 2 + Math.floor(Math.random() * 3);
  for (let s = 0; s < strandCount; s++) {
    // Root somewhere on the silhouette — sample one of the blobs and pick
    // a point near its rim so the tendril emerges from a visible lobe.
    const blob = blobs[Math.floor(Math.random() * blobs.length)];
    const rootAngle = Math.random() * Math.PI * 2;
    const rootRadius = blob.r * (0.65 + Math.random() * 0.3);
    const rootX = blob.x + Math.cos(rootAngle) * rootRadius;
    const rootY = blob.y + Math.sin(rootAngle) * rootRadius * 0.65;

    const length = (180 + Math.random() * 260) * scale;
    const beadCount = 14 + Math.floor(Math.random() * 14);
    const waveFreq = 1.2 + Math.random() * 2.2;
    const wavePhase = Math.random() * Math.PI * 2;
    const waveAmp = (10 + Math.random() * 26) * scale;

    for (let i = 0; i < beadCount; i++) {
      // Slight clustering toward the root so the strand thins to a wisp.
      const tt = Math.pow((i + 0.5) / beadCount, 0.9);
      const jitterX = (Math.random() - 0.5) * 6 * scale;
      const jitterY = (Math.random() - 0.5) * 6 * scale;
      const edge = 0.6 + 0.4 * tt; // very loose; pure vapor at the tip
      const alpha = (1 - tt * 0.85) * (0.35 + Math.random() * 0.25) + 0.04;
      droplets.push({
        x: cloud.ax + rootX,
        y: cloud.ay + rootY,
        vx: 0,
        vy: 0,
        hx: rootX + jitterX,
        hy: rootY + jitterY,
        cloud: cloudIndex,
        char: CHARS[Math.floor(Math.random() * CHARS.length)],
        size: (18 + Math.random() * 18) * scale * (1 - tt * 0.45),
        alpha: Math.min(0.85, Math.max(0.04, alpha)),
        rot: (Math.random() - 0.5) * Math.PI,
        rotVel: (Math.random() - 0.5) * 0.4,
        edge,
        tendril: {
          rootX: rootX + jitterX,
          rootY: rootY + jitterY,
          t: tt,
          strand: s,
          length,
          waveFreq,
          wavePhase,
          waveAmp,
        },
      });
    }
  }
}

function ExperimentsPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fetchQuote = useServerFn(getQuoteOfTheDay);
  const quoteRef = useRef<string>("");
  const quoteReadyRef = useRef<boolean>(false);
  // Pool of characters the clouds are allowed to materialize as. Starts
  // with the alphabet so clouds look populated immediately, then narrows
  // to the actual quote characters once the quote is fetched (so every
  // glyph in the quote — including punctuation — can plausibly appear in
  // a cloud and be claimed when its slot needs to be filled).
  const charPoolRef = useRef<string[]>(CHARS.split(""));

  const quoteAuthorRef = useRef<string>("");
  const quoteSeedTickRef = useRef<number>(0);
  // Set of characters that appear in the quote — used to give cloud
  // droplets carrying those glyphs a downward weight so they sink to
  // the underside (where rain peels off) instead of waiting on chance.
  const quoteCharSetRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    let cancelled = false;
    fetchQuote()
      .then((q) => {
        if (cancelled) return;
        const body = q.quote.toUpperCase().replace(/\s+/g, " ").trim();
        const author = q.author.toUpperCase().replace(/\s+/g, " ").trim();
        quoteRef.current = body;
        quoteAuthorRef.current = author;
        // Include the em-dash that prefixes the author line so a cloud
        // droplet can carry it; otherwise that slot can never be filled.
        const fullText = body + (author ? ` — ${author}` : "");
        const pool: string[] = [];
        for (const ch of fullText) {
          if (ch !== " ") pool.push(ch);
        }
        for (const ch of CHARS) pool.push(ch);
        charPoolRef.current = pool;
        const cs = new Set<string>();
        for (const ch of fullText) if (ch !== " ") cs.add(ch);
        quoteCharSetRef.current = cs;
        quoteReadyRef.current = true;
        quoteSeedTickRef.current += 1;
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [fetchQuote]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = 0;
    let height = 0;
    let dpr = Math.min(window.devicePixelRatio || 1, 2);

    const resize = () => {
      width = canvas.clientWidth;
      height = canvas.clientHeight;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    // Slot layout: each glyph of the quote has a fixed (x, y) "home" at the
    // bottom of the canvas. Rain droplets are assigned slots in order and
    // steer/land into them, assembling the quote as they fall.
    type Slot = { x: number; y: number; char: string; claimed: boolean };
    let slots: Slot[] = [];
    let slotsSig = "";
    let slotFontSize = 24;

    const layoutQuote = (): Slot[] => {
      const quote = quoteRef.current;
      const author = quoteAuthorRef.current;
      if (!quote) return [];
      // Responsive sizing: scales with viewport width with sensible
      // floor/ceiling so it stays legible on phones and tasteful on desktops.
      const fontSize = Math.max(
        13,
        Math.min(30, Math.min(width / 28, height / 28)),
      );
      slotFontSize = fontSize;
      const lineHeight = fontSize * 1.5;
      const maxW = Math.min(width * 0.88, 900);
      ctx.font = `bold ${fontSize}px Arial, sans-serif`;

      const wrap = (text: string): string[] => {
        const words = text.split(" ");
        const lines: string[] = [];
        let cur = "";
        for (const w of words) {
          const test = cur ? `${cur} ${w}` : w;
          if (ctx.measureText(test).width > maxW && cur) {
            lines.push(cur);
            cur = w;
          } else {
            cur = test;
          }
        }
        if (cur) lines.push(cur);
        return lines;
      };

      const quoteLines = wrap(quote);
      const authorLine = author ? `— ${author}` : "";
      const totalLines = quoteLines.length + (authorLine ? 2 : 0); // +1 spacer
      const bottomMargin = Math.max(60, height * 0.1);
      const startY =
        height - bottomMargin - totalLines * lineHeight + lineHeight / 2;
      const out: Slot[] = [];

      const layoutLine = (line: string, y: number) => {
        const lineW = ctx.measureText(line).width;
        let x = (width - lineW) / 2;
        for (const ch of line) {
          const chW = ctx.measureText(ch).width;
          if (ch !== " ") out.push({ x: x + chW / 2, y, char: ch, claimed: false });
          x += chW;
        }
      };

      for (let li = 0; li < quoteLines.length; li++) {
        layoutLine(quoteLines[li], startY + li * lineHeight);
      }
      if (authorLine) {
        // Blank spacer line, then author on its own line.
        const ay = startY + (quoteLines.length + 1) * lineHeight;
        layoutLine(authorLine, ay);
      }
      return out;
    };

    const ensureSlots = () => {
      const sig = `${quoteRef.current}|${quoteAuthorRef.current}|${width}|${height}`;
      if (sig === slotsSig && slots.length) return;
      slotsSig = sig;
      slots = layoutQuote();
      // Drop any in-flight (unsettled) rain so we don't double-fill slots.
      for (let i = droplets.length - 1; i >= 0; i--) {
        if (droplets[i].falling && !droplets[i].settled) {
          droplets.splice(i, 1);
        }
      }
    };




    const clouds: Cloud[] = [];
    const droplets: Droplet[] = [];
    const cloudCount = 4;
    for (let i = 0; i < cloudCount; i++) {
      const scale = 0.8 + Math.random() * 0.55;
      const cloud: Cloud = {
        ax: width + 200 + i * (320 + Math.random() * 260),
        ay: 90 + Math.random() * Math.max(60, height * 0.18),
        // Wider speed spread so faster clouds overtake slower ones and collide.
        vx: -(6 + Math.random() * 28),
        vy: (Math.random() - 0.5) * 4,
        radius: 0,
        slowed: false,
        rainIndex: 0,
        rainTimer: 0,
      };
      seedCloud(i, cloud, droplets, scale);
      clouds.push(cloud);
    }

    // Fluid interaction parameters
    const H = 34; // smoothing radius (px) for neighbor influence
    const H2 = H * H;
    const REPULSION = 520; // pressure-like push when too close
    const VISCOSITY = 0.18; // velocity smoothing toward neighbors
    const COHESION = 1.6; // spring back to home offset
    const DAMPING = 1.6; // velocity drag
    const ROT_DAMP = 1.2;

    // Spatial hash for neighbor queries
    const cellSize = H;
    const grid = new Map<number, number[]>();
    const cellKey = (cx: number, cy: number) => cx * 73856093 ^ cy * 19349663;

    let raf = 0;
    let last = performance.now();
    let t = 0;
    let lastSeedTick = -1;

    const render = (now: number) => {
      let dt = (now - last) / 1000;
      last = now;
      if (dt > 0.05) dt = 0.05;
      t += dt;

      // When the quote arrives, SEED clouds with the actual quote
      // characters so every glyph the quote needs is guaranteed to exist
      // somewhere in the clouds. We also sprinkle in the weighted pool
      // for visual variety. This is the "cheat" that lets the cloud
      // motion feel natural while still being able to finish the quote.
      if (quoteSeedTickRef.current !== lastSeedTick && quoteReadyRef.current) {
        lastSeedTick = quoteSeedTickRef.current;
        const pool = charPoolRef.current;
        const needed: string[] = [];
        const rainText =
          quoteRef.current +
          (quoteAuthorRef.current ? ` — ${quoteAuthorRef.current}` : "");
        for (const ch of rainText) {
          if (ch !== " ") needed.push(ch);
        }
        // Over-seed em dashes so the author attribution doesn't bottleneck
        // on a single rare droplet.
        for (let i = 0; i < 10; i++) needed.push("—");
        // Shuffle required glyphs so the cloud is seeded non-linearly rather
        // than reading left-to-right inside the vapor.
        for (let i = needed.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [needed[i], needed[j]] = [needed[j], needed[i]];
        }
        // Group eligible droplets by cloud so quote glyphs are distributed
        // across every cloud (not concentrated in one), and within each
        // cloud bias toward the underside so weight drops them out fast.
        const byCloud = new Map<number, number[]>();
        for (let di = 0; di < droplets.length; di++) {
          const d = droplets[di];
          if (!d.falling && !d.tendril) {
            d.quoteGlyph = false;
            const arr = byCloud.get(d.cloud);
            if (arr) arr.push(di);
            else byCloud.set(d.cloud, [di]);
          }
        }
        for (const arr of byCloud.values()) {
          arr.sort(
            (a, b) =>
              droplets[b].hy + Math.random() * 60 -
              (droplets[a].hy + Math.random() * 60),
          );
        }
        // Round-robin pick across clouds so every cloud gets quote glyphs.
        const cloudKeys = Array.from(byCloud.keys());
        const cursors = new Map<number, number>(cloudKeys.map((k) => [k, 0]));
        const eligible: number[] = [];
        let added = true;
        while (added) {
          added = false;
          for (const k of cloudKeys) {
            const arr = byCloud.get(k)!;
            const idx = cursors.get(k)!;
            if (idx < arr.length) {
              eligible.push(arr[idx]);
              cursors.set(k, idx + 1);
              added = true;
            }
          }
        }
        for (let i = 0; i < eligible.length; i++) {
          if (i < needed.length) {
            const d = droplets[eligible[i]];
            d.char = needed[i];
            d.quoteGlyph = true;
          } else if (pool.length) {
            const d = droplets[eligible[i]];
            d.char = pool[Math.floor(Math.random() * pool.length)];
            d.quoteGlyph = quoteCharSetRef.current.has(d.char);
          }
        }
      }





      // Advance cloud anchors (wind) and wrap.
      for (const c of clouds) {
        c.ax += c.vx * dt;
        c.ay += c.vy * dt;
        if (c.ax + c.radius < -50) {
          c.ax = width + 200 + Math.random() * 400;
          c.ay = 90 + Math.random() * Math.max(60, height * 0.18);
          c.vx = -(6 + Math.random() * 28);
          c.vy = (Math.random() - 0.5) * 4;
          c.slowed = false;
          c.rainIndex = 0;
          c.rainTimer = 0;
          // teleport non-falling droplets so they don't streak across the screen
          for (const d of droplets) {
            if (d.cloud === clouds.indexOf(c) && !d.falling) {
              d.x = c.ax + d.hx;
              d.y = c.ay + d.hy;
              d.vx = 0;
              d.vy = 0;
            }
          }
        }
        // Cloud has blown into ~40% of the page → slow it down and start raining.
        if (!c.slowed && c.ax < width * 0.6) {
          c.slowed = true;
        }
      }

      // Cloud-cloud anchor physics: soft elastic collisions so cloud bodies
      // bounce / glance off each other while their droplets intermingle and
      // appear to merge. Anchors carry "momentum" via vx/vy.
      for (let i = 0; i < clouds.length; i++) {
        for (let j = i + 1; j < clouds.length; j++) {
          const a = clouds[i];
          const b = clouds[j];
          const dx = b.ax - a.ax;
          const dy = b.ay - a.ay;
          const dist = Math.hypot(dx, dy) || 0.0001;
          const minDist = (a.radius + b.radius) * 0.7;
          if (dist < minDist) {
            const overlap = (minDist - dist) / minDist; // 0..1
            const nx = dx / dist;
            const ny = dy / dist;
            // Soft repulsion proportional to overlap (bounce).
            const push = overlap * 60;
            a.vx -= nx * push * dt;
            a.vy -= ny * push * dt;
            b.vx += nx * push * dt;
            b.vy += ny * push * dt;
            // Mild damping on the collision normal so they don't oscillate.
            const relV = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
            if (relV < 0) {
              const j2 = -relV * 0.25;
              a.vx -= nx * j2;
              a.vy -= ny * j2;
              b.vx += nx * j2;
              b.vy += ny * j2;
            }
          }
        }
        // Keep clouds drifting leftward; once "slowed" they nearly stall so
        // the rain falls from a near-stationary cloud body.
        const c = clouds[i];
        const targetVx = c.slowed ? -1.5 : -14;
        c.vx += (targetVx - c.vx) * 0.02 * dt * 5;
        const targetY = 80 + (i % 2) * 25;
        c.vy += (targetY - c.ay) * 0.02;
        c.vy *= Math.exp(-2.4 * dt);
        if (c.ay < 60) {
          c.ay = 60;
          if (c.vy < 0) c.vy = 0;
        }
        if (c.ay > 140) {
          c.ay = 140;
          if (c.vy > 0) c.vy = 0;
        }

        // Rain spawning: non-linear. Each cloud scans its own underside
        // for any droplet whose char matches ANY unclaimed slot. When it
        // finds one, that droplet falls into a (randomly chosen) matching
        // slot. Slots can fill out of order so the quote materializes in
        // a natural, scattered way.
        if (c.slowed && quoteReadyRef.current) {
          c.rainTimer += dt;
          const interval = 0.05;
          while (c.rainTimer >= interval) {
            c.rainTimer -= interval;
            ensureSlots();
            if (!slots.length) break;
            // Build a map of unclaimed slot chars → slot indices.
            const needMap = new Map<string, number[]>();
            let unclaimed = 0;
            for (let si = 0; si < slots.length; si++) {
              if (!slots[si].claimed) {
                unclaimed++;
                const arr = needMap.get(slots[si].char);
                if (arr) arr.push(si);
                else needMap.set(slots[si].char, [si]);
              }
            }
            if (!unclaimed) break;
            const cloudIdx = i;
            const matches: number[] = [];
            for (let di = 0; di < droplets.length; di++) {
              const dd = droplets[di];
              if (
                dd.cloud === cloudIdx &&
                !dd.tendril &&
                !dd.falling &&
                needMap.has(dd.char) &&
                dd.y > c.ay + 10
              ) {
                matches.push(di);
              }
            }
            if (!matches.length) break;
            // Pick a random matching droplet so different letters of the
            // quote fall first on different attempts — not always the lowest.
            const pickIdx = matches[Math.floor(Math.random() * matches.length)];
            const pick = droplets[pickIdx];
            const slotChoices = needMap.get(pick.char)!;
            const slotIdx =
              slotChoices[Math.floor(Math.random() * slotChoices.length)];
            const slot = slots[slotIdx];
            slot.claimed = true;
            pick.falling = true;
            pick.targetX = slot.x;
            pick.targetY = slot.y;
            pick.size = slotFontSize;
            pick.baseAlpha = 1;
            pick.alpha = 1;
            pick.edge = 0;
            pick.vx = (Math.random() - 0.5) * 20;
            pick.vy = 20 + Math.random() * 30;
            pick.rot = (Math.random() - 0.5) * 0.6;
            pick.rotVel = (Math.random() - 0.5) * 2;
          }
        }
      }


      // Build spatial hash
      grid.clear();
      for (let i = 0; i < droplets.length; i++) {
        const d = droplets[i];
        const cx = Math.floor(d.x / cellSize);
        const cy = Math.floor(d.y / cellSize);
        const k = cellKey(cx, cy);
        let bucket = grid.get(k);
        if (!bucket) {
          bucket = [];
          grid.set(k, bucket);
        }
        bucket.push(i);
      }

      // Accumulate fluid forces
      const ax = new Float32Array(droplets.length);
      const ay = new Float32Array(droplets.length);
      const vxAvg = new Float32Array(droplets.length);
      const vyAvg = new Float32Array(droplets.length);
      const wSum = new Float32Array(droplets.length);

      for (let i = 0; i < droplets.length; i++) {
        const d = droplets[i];
        const cx = Math.floor(d.x / cellSize);
        const cy = Math.floor(d.y / cellSize);
        for (let oy = -1; oy <= 1; oy++) {
          for (let ox = -1; ox <= 1; ox++) {
            const bucket = grid.get(cellKey(cx + ox, cy + oy));
            if (!bucket) continue;
            for (let bi = 0; bi < bucket.length; bi++) {
              const j = bucket[bi];
              if (j <= i) continue;
              const o = droplets[j];
              const dx = o.x - d.x;
              const dy = o.y - d.y;
              const d2 = dx * dx + dy * dy;
              if (d2 >= H2 || d2 < 0.001) continue;
              const dist = Math.sqrt(d2);
              const w = 1 - dist / H; // 0..1
              // repulsion (Newton's 3rd law)
              const f = (REPULSION * w * w) / dist;
              const fx = dx * f;
              const fy = dy * f;
              ax[i] -= fx;
              ay[i] -= fy;
              ax[j] += fx;
              ay[j] += fy;
              // viscosity accumulators
              vxAvg[i] += o.vx * w;
              vyAvg[i] += o.vy * w;
              vxAvg[j] += d.vx * w;
              vyAvg[j] += d.vy * w;
              wSum[i] += w;
              wSum[j] += w;
            }
          }
        }
      }

      // Integrate
      const GRAVITY = 620; // px/s^2 — rain accelerates as it falls
      for (let i = 0; i < droplets.length; i++) {
        const d = droplets[i];
        const c = clouds[d.cloud];

        if (d.falling) {
          if (d.settled) continue; // locked into its slot — render only.

          const tx = d.targetX ?? d.x;
          const ty = d.targetY ?? height;

          // Free-falling rain: gravity-driven, still participates in fluid
          // repulsion/viscosity via ax/ay, with a lateral spring steering
          // toward the assigned slot's x so it lands on target.
          let axi = ax[i];
          let ayi = ay[i] + GRAVITY;
          // Lateral spring toward target x — gentle high up, firmer as it
          // descends so it locks onto its column near landing.
          const verticalProgress = Math.min(1, Math.max(0, (d.y - 100) / Math.max(1, ty - 100)));
          const lateralK = 3 + verticalProgress * 14;
          axi += (tx - d.x) * lateralK;
          // A touch of organic wobble while still high.
          axi += Math.sin(d.y * 0.02 + t * 1.3 + d.cloud) * (1 - verticalProgress) * 18;

          d.vx += axi * dt;
          d.vy += ayi * dt;

          if (wSum[i] > 0) {
            const avgVx = vxAvg[i] / wSum[i];
            const avgVy = vyAvg[i] / wSum[i];
            // Weaker viscosity blend so drops keep their downward momentum.
            d.vx += (avgVx - d.vx) * 0.06;
            d.vy += (avgVy - d.vy) * 0.06;
          }

          // Lateral damping (so the spring settles); very light vertical
          // damping so gravity dominates and drops accelerate as they fall.
          d.vx *= Math.exp(-3.5 * dt);
          d.vy *= Math.exp(-0.12 * dt);
          // Rain never reverses — clamp upward motion so a droplet that
          // started falling can only continue downward.
          if (d.vy < 0) d.vy = 0;

          d.x += d.vx * dt;
          d.y += d.vy * dt;

          // Rotate with motion so characters tumble as they fall.
          const targetRot = Math.atan2(d.vy, d.vx) - Math.PI / 2;
          let diff = targetRot - d.rot;
          while (diff > Math.PI) diff -= 2 * Math.PI;
          while (diff < -Math.PI) diff += 2 * Math.PI;
          d.rotVel += diff * 1.2 * dt;
          d.rotVel *= Math.exp(-ROT_DAMP * dt);
          d.rot += d.rotVel * dt;

          d.alpha = d.baseAlpha ?? 1;

          // Land: when the drop reaches its slot row, snap into place.
          if (d.y >= ty) {
            d.x = tx;
            d.y = ty;
            d.vx = 0;
            d.vy = 0;
            d.rot = 0;
            d.rotVel = 0;
            d.settled = true;
            d.alpha = 1;
          }
          continue;
        }


        // Cohesion: spring back toward home offset. Edge droplets are
        // bound far more loosely — they trail off as vapor, get caught up
        // by other passing clouds, and let bodies appear to merge.
        // Tendril droplets recompute their home each frame so the strand
        // points opposite the cloud's velocity and curves with a wave.
        let hx = d.hx;
        let hy = d.hy;
        if (d.tendril) {
          const tn = d.tendril;
          const speed = Math.hypot(c.vx, c.vy) || 1;
          // Direction the strand trails — opposite the cloud's motion.
          const dirX = -c.vx / speed;
          const dirY = -c.vy / speed;
          // Perpendicular for lateral waving.
          const perpX = -dirY;
          const perpY = dirX;
          const along = tn.t * tn.length;
          // Strand droops slightly as it stretches.
          const droop = tn.t * tn.t * 18;
          // Lateral wave grows toward the tip; phase travels along strand.
          const wave =
            Math.sin(tn.t * tn.waveFreq * Math.PI - t * 1.4 + tn.wavePhase) *
            tn.waveAmp *
            tn.t;
          hx = tn.rootX + dirX * along + perpX * wave;
          hy = tn.rootY + dirY * along + perpY * wave + droop;
          // Keep d.hx/d.hy in sync for any code that reads them.
          d.hx = hx;
          d.hy = hy;
        }
        const cohesionScale =
          COHESION * (1 - 0.85 * d.edge) * (d.tendril ? 0.6 : 1);
        const tx = c.ax + hx;
        const ty = c.ay + hy;
        const sx = (tx - d.x) * cohesionScale;
        const sy = (ty - d.y) * cohesionScale;

        let axi = ax[i] + sx;
        let ayi = ay[i] + sy;

        // Seeded quote glyphs carry weight: only the explicitly planted
        // quote/author characters sink, which keeps the cloud high while
        // making those exact droplets push toward the underside and rain.
        if (
          !d.tendril &&
          d.quoteGlyph &&
          quoteReadyRef.current &&
          d.y >= c.ay + d.hy - 8
        ) {
          ayi += 180;
        }

        // Turbulence — stronger for outer/vapor droplets.
        const turb = 12 + d.edge * 28;
        const tNoiseX =
          Math.sin(d.x * 0.012 + t * 0.7 + d.cloud) +
          Math.cos(d.y * 0.013 - t * 0.5);
        const tNoiseY =
          Math.cos(d.x * 0.011 - t * 0.6 + d.cloud * 1.3) +
          Math.sin(d.y * 0.014 + t * 0.8);
        axi += tNoiseX * turb;
        ayi += tNoiseY * turb * 0.75;

        d.vx += axi * dt;
        d.vy += ayi * dt;

        // Viscosity: blend toward neighbour-averaged velocity.
        if (wSum[i] > 0) {
          const avgVx = vxAvg[i] / wSum[i];
          const avgVy = vyAvg[i] / wSum[i];
          d.vx += (avgVx - d.vx) * Math.min(1, VISCOSITY);
          d.vy += (avgVy - d.vy) * Math.min(1, VISCOSITY);
        }

        // Damping
        const damp = Math.exp(-DAMPING * dt);
        d.vx *= damp;
        d.vy *= damp;

        // Carry along the cloud's wind so droplets drift with it.
        d.x += (d.vx + c.vx) * dt;
        d.y += (d.vy + c.vy) * dt;

        // Rotation eases toward velocity direction
        const speed = Math.hypot(d.vx, d.vy);
        if (speed > 8) {
          const targetRot = Math.atan2(d.vy, d.vx);
          let diff = targetRot - d.rot;
          while (diff > Math.PI) diff -= 2 * Math.PI;
          while (diff < -Math.PI) diff += 2 * Math.PI;
          d.rotVel += diff * 1.5 * dt;
        }
        d.rotVel *= Math.exp(-ROT_DAMP * dt);
        d.rot += d.rotVel * dt;
      }

      // Safety: cull any rain that overshoots far past the bottom (shouldn't
      // happen since drops land at their slot, but guard against drift).
      for (let i = droplets.length - 1; i >= 0; i--) {
        const d = droplets[i];
        if (d.falling && !d.settled && d.y > height + 80) {
          droplets.splice(i, 1);
        }
      }



      // Render
      ctx.clearRect(0, 0, width, height);
      ctx.textBaseline = "middle";
      ctx.textAlign = "center";
      const fg = getComputedStyle(canvas).color || "#111";
      ctx.fillStyle = fg;

      for (let i = 0; i < droplets.length; i++) {
        const d = droplets[i];
        ctx.save();
        ctx.translate(d.x, d.y);
        ctx.rotate(d.rot);
        ctx.globalAlpha = d.alpha;
        ctx.font = `bold ${d.size.toFixed(1)}px Arial, sans-serif`;
        ctx.fillText(d.char, 0, 0);
        ctx.restore();
      }
      ctx.globalAlpha = 1;

      raf = requestAnimationFrame(render);
    };
    raf = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <div
      className="relative min-h-[calc(100vh-3.5rem)] text-foreground"
      style={{
        background: `linear-gradient(to bottom, oklch(0.25 0.005 85), var(--background))`,
      }}
    >
      <div
        aria-label="Human-Coded"
        className="absolute top-10 left-10 z-10 select-none pointer-events-none font-normal leading-[0.95] tracking-tight text-white"
        style={{
          fontFamily:
            'Garet, "Helvetica Neue", Helvetica, Arial, system-ui, sans-serif',
        }}
      >
        <div className="text-[40px] md:text-[60px] lg:text-[90px] italic">
          <span style={{ marginRight: "6px" }}>|</span>HUMAN
        </div>
        <div
          className="text-[40px] md:text-[60px] lg:text-[90px] lg:ml-[42px] ml-[18px]"
        >
          -CODED
        </div>
      </div>
      <canvas
        ref={canvasRef}
        className="block w-full h-[calc(100vh-3.5rem)]"
      />
    </div>
  );
}
