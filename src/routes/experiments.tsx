import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef } from "react";

export const Route = createFileRoute("/experiments")({
  component: ExperimentsPage,
});

type Particle = {
  ox: number;
  oy: number;
  phase: number;
  freq: number;
  amp: number;
  driftPhaseX: number;
  driftPhaseY: number;
  driftFreqX: number;
  driftFreqY: number;
  driftAmpX: number;
  driftAmpY: number;
  rot: number;
  rotSpeed: number;
  rotPhase: number;
  rotAmp: number;
  char: string;
  size: number;
  alpha: number;
};

type CloudBank = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  bobFreq: number;
  bobAmp: number;
  bobPhase: number;
  particles: Particle[];
  minOx: number;
  maxOx: number;
};

const CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

function makeCloud(scale: number): CloudBank {
  const particles: Particle[] = [];
  const blobCount = 4 + Math.floor(Math.random() * 3);
  const blobs: { x: number; y: number; r: number; weight: number }[] = [];
  for (let i = 0; i < blobCount; i++) {
    blobs.push({
      x: (Math.random() - 0.5) * 320 * scale,
      y: (Math.random() - 0.5) * 80 * scale,
      r: (90 + Math.random() * 90) * scale,
      weight: 0.4 + Math.random() * 0.6,
    });
  }
  const totalWeight = blobs.reduce((s, b) => s + b.weight, 0);
  const count = Math.floor((140 + Math.random() * 140) * scale);

  let minOx = Infinity;
  let maxOx = -Infinity;

  for (let i = 0; i < count; i++) {
    let r = Math.random() * totalWeight;
    let chosen = blobs[0];
    for (const b of blobs) {
      r -= b.weight;
      if (r <= 0) {
        chosen = b;
        break;
      }
    }
    const u = (Math.random() + Math.random() + Math.random()) / 3;
    const radius = u * chosen.r;
    const angle = Math.random() * Math.PI * 2;
    const ox = chosen.x + Math.cos(angle) * radius;
    const oy = chosen.y + Math.sin(angle) * radius * 0.7;

    if (ox < minOx) minOx = ox;
    if (ox > maxOx) maxOx = ox;

    const distNorm = radius / chosen.r;
    const alpha = (1 - distNorm * 0.65) * (0.3 + chosen.weight * 0.6);

    particles.push({
      ox,
      oy,
      phase: Math.random() * Math.PI * 2,
      freq: 0.2 + Math.random() * 0.3,
      amp: 1.5 + Math.random() * 3.5,
      driftPhaseX: Math.random() * Math.PI * 2,
      driftPhaseY: Math.random() * Math.PI * 2,
      driftFreqX: 0.08 + Math.random() * 0.2,
      driftFreqY: 0.06 + Math.random() * 0.18,
      driftAmpX: 4 + Math.random() * 10,
      driftAmpY: 3 + Math.random() * 7,
      rot: (Math.random() - 0.5) * Math.PI,
      rotSpeed: (Math.random() - 0.5) * 0.08,
      rotPhase: Math.random() * Math.PI * 2,
      rotAmp: 0.1 + Math.random() * 0.35,
      char: CHARS[Math.floor(Math.random() * CHARS.length)],
      size: (22 + Math.random() * 28) * scale,
      alpha: Math.min(0.95, Math.max(0.08, alpha)),
    });
  }

  return {
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    bobFreq: 0.1 + Math.random() * 0.15,
    bobAmp: 6 + Math.random() * 8,
    bobPhase: Math.random() * Math.PI * 2,
    particles,
    minOx,
    maxOx,
  };
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

    // A few cloud banks of varying scale, each drifting in from off the
    // top-right at its own slow pace. Different speeds cause them to
    // catch up to one another, overlap (collide) and visually merge.
    const clouds: CloudBank[] = [];
    const cloudCount = 4;
    for (let i = 0; i < cloudCount; i++) {
      const scale = 0.75 + Math.random() * 0.6;
      const c = makeCloud(scale);
      // Stagger their entry: place each progressively further off-screen
      // to the right so they drift in one after another.
      c.x = width + 250 + i * (350 + Math.random() * 200);
      // Keep them up high — within the top third
      c.y = 80 + Math.random() * Math.max(60, height * 0.18);
      // Slow varied horizontal drift; small downward component so taller
      // ones don't all overlap perfectly.
      c.vx = -(8 + Math.random() * 14);
      c.vy = (Math.random() - 0.5) * 2;
      clouds.push(c);
    }

    let raf = 0;
    let last = performance.now();
    let t = 0;

    const render = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      t += dt;

      ctx.clearRect(0, 0, width, height);
      ctx.textBaseline = "middle";
      ctx.textAlign = "center";
      const fg = getComputedStyle(canvas).color || "#111";

      for (const cloud of clouds) {
        cloud.x += cloud.vx * dt;
        cloud.y += cloud.vy * dt;

        // Keep clouds up top — softly pull toward a band in the upper area.
        const topBandTarget = 80 + (cloud.bobPhase % 1) * Math.max(40, height * 0.12);
        cloud.y += (topBandTarget - cloud.y) * (1 - Math.exp(-dt * 0.15));

        // Once fully past the left edge, wrap back to the right.
        if (cloud.x + cloud.maxOx < -50) {
          cloud.x = width + 200 + Math.random() * 400;
          cloud.y = 80 + Math.random() * Math.max(60, height * 0.18);
          cloud.vx = -(8 + Math.random() * 14);
        }

        const bobY = Math.sin(t * cloud.bobFreq + cloud.bobPhase) * cloud.bobAmp;

        for (let i = 0; i < cloud.particles.length; i++) {
          const p = cloud.particles[i];
          const bob = Math.sin(t * p.freq + p.phase) * p.amp;
          const driftX = Math.sin(t * p.driftFreqX + p.driftPhaseX) * p.driftAmpX;
          const driftY = Math.cos(t * p.driftFreqY + p.driftPhaseY) * p.driftAmpY;

          const x = cloud.x + p.ox + driftX;
          const y = cloud.y + p.oy + bob + bobY + driftY;

          const rotation =
            p.rot +
            p.rotSpeed * t +
            Math.sin(t * (p.driftFreqX * 0.8) + p.rotPhase) * p.rotAmp;

          ctx.save();
          ctx.translate(x, y);
          ctx.rotate(rotation);
          ctx.globalAlpha = p.alpha;
          ctx.fillStyle = fg;
          ctx.font = `bold ${p.size.toFixed(1)}px Arial, sans-serif`;
          ctx.fillText(p.char, 0, 0);
          ctx.restore();
        }
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
        className="absolute top-4 left-4 z-10 select-none pointer-events-none font-black leading-[0.95] tracking-tight text-foreground"
        style={{
          fontFamily:
            'Manrope, "Helvetica Neue", Helvetica, Arial, system-ui, sans-serif',
          fontStretch: "condensed",
        }}
      >
        <div
          className="text-[30px]"
          style={{ fontStyle: "italic", fontWeight: 900 }}
        >
          <span style={{ marginRight: "2px" }}>|</span>HUMAN
        </div>
        <div
          className="text-[30px]"
          style={{ fontWeight: 900, marginLeft: "14px" }}
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
