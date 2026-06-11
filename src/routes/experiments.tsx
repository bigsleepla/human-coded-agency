import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef } from "react";

export const Route = createFileRoute("/experiments")({
  component: ExperimentsPage,
});

// Each character is a droplet of water. Together, their pairwise
// interactions (repulsion + viscosity + cohesion back to a slowly drifting
// home) cause them to behave like a fluid body — a cloud.
type Droplet = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  // Home offset relative to its parent cloud's anchor — gives the cloud
  // its overall silhouette while letting droplets jostle freely.
  hx: number;
  hy: number;
  cloud: number; // index of parent cloud
  char: string;
  size: number;
  alpha: number;
  rot: number;
  rotVel: number;
};

type Cloud = {
  ax: number; // anchor x (drifts with wind)
  ay: number; // anchor y
  vx: number; // wind velocity
  vy: number;
  radius: number; // for wrap bookkeeping
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
    const u = (Math.random() + Math.random()) / 2; // bias toward center
    const radius = u * chosen.r;
    const angle = Math.random() * Math.PI * 2;
    const hx = chosen.x + Math.cos(angle) * radius;
    const hy = chosen.y + Math.sin(angle) * radius * 0.65;

    const distFromBlob = radius / chosen.r;
    const alpha = (1 - distFromBlob * 0.6) * (0.35 + chosen.w * 0.55);

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
      size: (22 + Math.random() * 26) * scale,
      alpha: Math.min(0.95, Math.max(0.1, alpha)),
      rot: (Math.random() - 0.5) * Math.PI,
      rotVel: (Math.random() - 0.5) * 0.4,
    });
  }
  cloud.radius = maxR + 60 * scale;
}

function ExperimentsPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

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

    const clouds: Cloud[] = [];
    const droplets: Droplet[] = [];
    const cloudCount = 4;
    for (let i = 0; i < cloudCount; i++) {
      const scale = 0.8 + Math.random() * 0.55;
      const cloud: Cloud = {
        ax: width + 200 + i * (380 + Math.random() * 220),
        ay: 90 + Math.random() * Math.max(60, height * 0.18),
        vx: -(10 + Math.random() * 12),
        vy: 0,
        radius: 0,
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
          c.vx = -(10 + Math.random() * 12);
          // teleport droplets so they don't streak across the screen
          for (const d of droplets) {
            if (d.cloud === clouds.indexOf(c)) {
              d.x = c.ax + d.hx;
              d.y = c.ay + d.hy;
              d.vx = 0;
              d.vy = 0;
            }
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
      for (let i = 0; i < droplets.length; i++) {
        const d = droplets[i];
        const c = clouds[d.cloud];

        // Cohesion: spring back toward home offset within the cloud, so
        // the cloud retains its silhouette while drifting.
        const tx = c.ax + d.hx;
        const ty = c.ay + d.hy;
        const sx = (tx - d.x) * COHESION;
        const sy = (ty - d.y) * COHESION;

        let axi = ax[i] + sx;
        let ayi = ay[i] + sy;

        // Subtle turbulence (curl-noise-ish) so neighbours swirl gently.
        const tNoiseX =
          Math.sin(d.x * 0.012 + t * 0.7 + d.cloud) +
          Math.cos(d.y * 0.013 - t * 0.5);
        const tNoiseY =
          Math.cos(d.x * 0.011 - t * 0.6 + d.cloud * 1.3) +
          Math.sin(d.y * 0.014 + t * 0.8);
        axi += tNoiseX * 14;
        ayi += tNoiseY * 10;

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
    <div className="relative min-h-[calc(100vh-3.5rem)] bg-background text-foreground">
      <div
        aria-label="Human-Coded"
        className="absolute top-4 left-4 z-10 select-none pointer-events-none font-normal leading-[0.95] tracking-tight text-foreground"
        style={{
          fontFamily:
            'Garet, "Helvetica Neue", Helvetica, Arial, system-ui, sans-serif',
        }}
      >
        <div className="text-[90px] italic">
          <span style={{ marginRight: "6px" }}>|</span>HUMAN
        </div>
        <div
          className="text-[90px]"
          style={{ marginLeft: "42px" }}
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
