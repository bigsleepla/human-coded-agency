import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef } from "react";

export const Route = createFileRoute("/experiments")({
  component: ExperimentsPage,
});

type Particle = {
  ox: number;
  oy: number;
  // bobbing
  phase: number;
  freq: number;
  amp: number;
  // local fluid drift
  driftPhaseX: number;
  driftPhaseY: number;
  driftFreqX: number;
  driftFreqY: number;
  driftAmpX: number;
  driftAmpY: number;
  // rotation
  rot: number;
  rotSpeed: number;
  rotPhase: number;
  rotAmp: number;
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

    // Cloud built from overlapping blobs — denser core, lighter wisps.
    const PARTICLE_COUNT = 340;
    const blobs = [
      { x: -180, y: -20, r: 140, weight: 1.0 },
      { x: 60, y: -60, r: 160, weight: 0.9 },
      { x: 200, y: 10, r: 130, weight: 0.7 },
      { x: -40, y: 40, r: 180, weight: 0.85 },
      { x: -260, y: 60, r: 110, weight: 0.5 },
      { x: 280, y: 80, r: 120, weight: 0.45 },
      { x: 0, y: -110, r: 100, weight: 0.6 },
    ];
    const totalWeight = blobs.reduce((s, b) => s + b.weight, 0);

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      let r = Math.random() * totalWeight;
      let chosen = blobs[0];
      for (const b of blobs) {
        r -= b.weight;
        if (r <= 0) { chosen = b; break; }
      }
      const u = (Math.random() + Math.random() + Math.random()) / 3;
      const radius = u * chosen.r;
      const angle = Math.random() * Math.PI * 2;
      const ox = chosen.x + Math.cos(angle) * radius;
      const oy = chosen.y + Math.sin(angle) * radius * 0.75;

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

    // Drift in from top-right toward lower-left, then gently traverse.
    // Start off-canvas top-right.
    const startX = () => width + 350;
    const startY = () => -250;
    let cloudX = startX();
    let cloudY = startY();

    const render = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      t += dt;

      // Target: settle around middle-left, then very slowly continue drifting
      // diagonally. Use easing toward a moving target for a fluid feel.
      const targetX = width * 0.42 - t * 6;   // slow continued drift left
      const targetY = height * 0.5 + Math.sin(t * 0.25) * 18;

      // Critically-damped-ish lerp
      const ease = 1 - Math.exp(-dt * 0.45);
      cloudX += (targetX - cloudX) * ease;
      cloudY += (targetY - cloudY) * ease;

      ctx.clearRect(0, 0, width, height);
      ctx.textBaseline = "middle";
      ctx.textAlign = "center";
      const fg = getComputedStyle(canvas).color || "#111";

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        const bob = Math.sin(t * p.freq + p.phase) * p.amp;
        const driftX = Math.sin(t * p.driftFreqX + p.driftPhaseX) * p.driftAmpX;
        const driftY = Math.cos(t * p.driftFreqY + p.driftPhaseY) * p.driftAmpY;

        const x = cloudX + p.ox + driftX;
        const y = cloudY + p.oy + bob + driftY;

        const rotation =
          p.rot +
          p.rotSpeed * t +
          Math.sin(t * (p.driftFreqX * 0.8) + p.rotPhase) * p.rotAmp;

        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(rotation);
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = fg;
        ctx.font = `${p.size.toFixed(1)}px Arial, sans-serif`;
        ctx.fillText(p.char, 0, 0);
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
    <div className="min-h-[calc(100vh-3.5rem)] bg-background text-foreground">
      <canvas
        ref={canvasRef}
        className="block w-full h-[calc(100vh-3.5rem)]"
      />
    </div>
  );
}
