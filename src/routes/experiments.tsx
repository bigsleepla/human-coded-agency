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
  const quoteRef = useRef<string>(
    "HUMAN INTELLIGENCE AND CREATIVITY ARE UNIQUELY OURS",
  );

  useEffect(() => {
    let cancelled = false;
    fetchQuote()
      .then((q) => {
        if (cancelled) return;
        const txt = `${q.quote} — ${q.author}`.toUpperCase();
        quoteRef.current = txt.replace(/\s+/g, " ").trim();
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
    type Slot = { x: number; y: number; char: string };
    let slots: Slot[] = [];
    let nextSlot = 0;
    let slotsSig = "";
    let slotFontSize = 24;

    const layoutQuote = (): Slot[] => {
      const quote = quoteRef.current;
      if (!quote) return [];
      const fontSize = Math.max(16, Math.min(30, width / 48));
      slotFontSize = fontSize;
      const lineHeight = fontSize * 1.45;
      const maxW = width * 0.82;
      ctx.font = `bold ${fontSize}px Arial, sans-serif`;
      const words = quote.split(" ");
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
      const bottomMargin = Math.max(70, height * 0.12);
      const startY =
        height - bottomMargin - lines.length * lineHeight + lineHeight / 2;
      const out: Slot[] = [];
      for (let li = 0; li < lines.length; li++) {
        const line = lines[li];
        const lineW = ctx.measureText(line).width;
        let x = (width - lineW) / 2;
        const y = startY + li * lineHeight;
        for (const ch of line) {
          const chW = ctx.measureText(ch).width;
          if (ch !== " ") {
            out.push({ x: x + chW / 2, y, char: ch });
          }
          x += chW;
        }
      }
      return out;
    };

    const ensureSlots = () => {
      const sig = `${quoteRef.current}|${width}|${height}`;
      if (sig === slotsSig && slots.length) return;
      slotsSig = sig;
      slots = layoutQuote();
      nextSlot = 0;
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

    const render = (now: number) => {
      let dt = (now - last) / 1000;
      last = now;
      if (dt > 0.05) dt = 0.05;
      t += dt;

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
        const targetY = 110 + (i % 2) * 40;
        c.vy += (targetY - c.ay) * 0.002;
        c.vy *= Math.exp(-0.6 * dt);

        // Rain spawning: once slowed, drip the quote characters in sequence
        // from random core droplets of this cloud.
        if (c.slowed) {
          c.rainTimer += dt;
          const interval = 0.07; // seconds between drops per cloud
          while (c.rainTimer >= interval) {
            c.rainTimer -= interval;
            const quote = quoteRef.current;
            if (!quote.length) break;
            // Pick a core (non-tendril, non-falling, low-edge) droplet of this cloud.
            const cloudIdx = i;
            const candidates: number[] = [];
            for (let di = 0; di < droplets.length; di++) {
              const dd = droplets[di];
              if (dd.cloud === cloudIdx && !dd.tendril && !dd.falling && dd.edge < 0.6) {
                candidates.push(di);
              }
            }
            if (!candidates.length) break;
            const src = droplets[candidates[Math.floor(Math.random() * candidates.length)]];
            let ch = quote[c.rainIndex % quote.length];
            c.rainIndex++;
            // Skip spaces so we don't drop invisible characters.
            let guard = 0;
            while (ch === " " && guard++ < 8) {
              ch = quote[c.rainIndex % quote.length];
              c.rainIndex++;
            }
            droplets.push({
              x: src.x,
              y: src.y,
              vx: (Math.random() - 0.5) * 20,
              vy: 20 + Math.random() * 30,
              hx: 0,
              hy: 0,
              cloud: cloudIdx,
              char: ch,
              size: 18 + Math.random() * 10,
              alpha: 0.95,
              baseAlpha: 0.95,
              rot: 0,
              rotVel: 0,
              edge: 0,
              falling: true,
            });
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
          // Free-falling rain: no cohesion, no cloud wind, gravity-driven,
          // but still participates in fluid repulsion/viscosity via ax/ay.
          let axi = ax[i];
          let ayi = ay[i] + GRAVITY;
          // Mild lateral turbulence for organic streaks.
          axi += Math.sin(d.y * 0.02 + t * 1.3 + d.cloud) * 20;

          d.vx += axi * dt;
          d.vy += ayi * dt;

          if (wSum[i] > 0) {
            const avgVx = vxAvg[i] / wSum[i];
            const avgVy = vyAvg[i] / wSum[i];
            // Weaker viscosity blend so drops keep their momentum.
            d.vx += (avgVx - d.vx) * 0.06;
            d.vy += (avgVy - d.vy) * 0.06;
          }

          // Very light damping — air resistance, but momentum dominates.
          const damp = Math.exp(-0.15 * dt);
          d.vx *= damp;
          d.vy *= damp;

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

          // Fade near the bottom so removal isn't abrupt.
          const base = d.baseAlpha ?? 0.95;
          const fadeStart = height - 120;
          d.alpha = d.y > fadeStart
            ? base * Math.max(0, 1 - (d.y - fadeStart) / 120)
            : base;
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

      // Cull rain that has fallen off the bottom of the screen.
      for (let i = droplets.length - 1; i >= 0; i--) {
        const d = droplets[i];
        if (d.falling && d.y > height + 40) {
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
