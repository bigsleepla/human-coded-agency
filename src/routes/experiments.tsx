import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef } from "react";

export const Route = createFileRoute("/experiments")({
  component: ExperimentsPage,
});

type Particle = {
  // position relative to cloud center
  ox: number;
  oy: number;
  // bobbing
  phase: number;
  freq: number;
  amp: number;
  // drift within cloud
  dx: number;
  dy: number;
  driftPhase: number;
  driftFreq: number;
  char: string;
  size: number;
  alpha: number;
};

const CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

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

    const particles: Particle[] = [];

    // Build a cloud shape via several overlapping "blobs" (denser/lighter patches)
    const PARTICLE_COUNT = 320;
    const blobs = [
      { x: -180, y: -20, r: 140, weight: 1.0 },   // dense core
      { x: 60, y: -60, r: 160, weight: 0.9 },     // dense
      { x: 200, y: 10, r: 130, weight: 0.7 },
      { x: -40, y: 40, r: 180, weight: 0.85 },
      { x: -260, y: 60, r: 110, weight: 0.5 },    // lighter edge
      { x: 280, y: 80, r: 120, weight: 0.45 },    // lighter edge
      { x: 0, y: -110, r: 100, weight: 0.6 },
    ];
    const totalWeight = blobs.reduce((s, b) => s + b.weight, 0);

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      // pick a blob weighted
      let r = Math.random() * totalWeight;
      let chosen = blobs[0];
      for (const b of blobs) {
        r -= b.weight;
        if (r <= 0) { chosen = b; break; }
      }
      // gaussian-ish placement (denser at center)
      const u = (Math.random() + Math.random() + Math.random()) / 3;
      const radius = u * chosen.r;
      const angle = Math.random() * Math.PI * 2;
      const ox = chosen.x + Math.cos(angle) * radius;
      const oy = chosen.y + Math.sin(angle) * radius * 0.7; // flatter cloud

      // density-based alpha — center denser/darker
      const distNorm = radius / chosen.r;
      const alpha = (1 - distNorm * 0.7) * (0.35 + chosen.weight * 0.55);

      particles.push({
        ox,
        oy,
        phase: Math.random() * Math.PI * 2,
        freq: 0.3 + Math.random() * 0.5,
        amp: 2 + Math.random() * 5,
        dx: 0,
        dy: 0,
        driftPhase: Math.random() * Math.PI * 2,
        driftFreq: 0.1 + Math.random() * 0.25,
        char: CHARS[Math.floor(Math.random() * CHARS.length)],
        size: 10 + Math.random() * 10,
        alpha: Math.min(0.95, Math.max(0.08, alpha)),
      });
    }

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

    let raf = 0;
    let last = performance.now();
    let t = 0;

    // cloud-center motion: slow horizontal traverse with gentle vertical bob
    const traverseSpeed = 18; // px/s — slow
    let cloudX = -200; // start off-screen left

    const render = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      t += dt;

      cloudX += traverseSpeed * dt;
      // wrap to the left once it fully exits the right side
      const cloudHalfWidth = 500;
      if (cloudX > width + cloudHalfWidth) cloudX = -cloudHalfWidth;
      const cloudY = height / 2 + Math.sin(t * 0.35) * 12;

      ctx.clearRect(0, 0, width, height);
      ctx.font = "";
      ctx.textBaseline = "middle";
      ctx.textAlign = "center";

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        const bob = Math.sin(t * p.freq + p.phase) * p.amp;
        const driftX = Math.sin(t * p.driftFreq + p.driftPhase) * 6;
        const driftY = Math.cos(t * p.driftFreq * 0.8 + p.driftPhase) * 4;

        const x = cloudX + p.ox + driftX;
        const y = cloudY + p.oy + bob + driftY;

        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = "hsl(var(--foreground))";
        ctx.font = `${p.size.toFixed(1)}px Arial, sans-serif`;
        ctx.fillText(p.char, x, y);
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
    <div className="min-h-[calc(100vh-3.5rem)] bg-background">
      <canvas
        ref={canvasRef}
        className="block w-full h-[calc(100vh-3.5rem)]"
      />
    </div>
  );
}
