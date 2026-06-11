import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/experiments")({
  component: ExperimentsPage,
});

/**
 * "Human code" rendered as three counter-rotating rings:
 *   – Outer ring: language (letters + numbers)
 *   – Middle ring: genetics (A / T / C / G)
 *   – Inner ring: machine language (0 / 1)
 *
 * Pure inline SVG + CSS keyframes. No canvas, no libs, no JS animation loop.
 */

const LANGUAGE = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789".split("");
const GENETICS = Array.from({ length: 48 }, (_, i) => "ATCG"[i % 4]);
const BINARY = Array.from({ length: 64 }, (_, i) =>
  // deterministic pseudo-random pattern so SSR + client match
  ((i * 2654435761) >>> 0) % 2 === 0 ? "0" : "1",
);

type RingProps = {
  radius: number;
  glyphs: string[];
  fontSize: number;
  className: string;
};

function Ring({ radius, glyphs, fontSize, className }: RingProps) {
  const step = 360 / glyphs.length;
  return (
    <g className={className} style={{ transformOrigin: "250px 250px" }}>
      <circle
        cx={250}
        cy={250}
        r={radius}
        fill="none"
        stroke="currentColor"
        strokeOpacity={0.15}
        strokeWidth={1}
      />
      {glyphs.map((g, i) => {
        const angle = (i * step * Math.PI) / 180;
        const x = 250 + radius * Math.cos(angle);
        const y = 250 + radius * Math.sin(angle);
        return (
          <text
            key={i}
            x={x}
            y={y}
            fontSize={fontSize}
            fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
            fill="currentColor"
            textAnchor="middle"
            dominantBaseline="central"
          >
            {g}
          </text>
        );
      })}
    </g>
  );
}

function ExperimentsPage() {
  return (
    <div className="relative min-h-[calc(100vh-3.5rem)] overflow-hidden bg-[#0A0A0A] text-[#F4F1EA]">
      <style>{`
        @keyframes spin-cw  { to { transform: rotate(360deg); } }
        @keyframes spin-ccw { to { transform: rotate(-360deg); } }
        @keyframes core-pulse {
          0%, 100% { transform: scale(1);   opacity: 0.9; }
          50%      { transform: scale(1.08); opacity: 1; }
        }
        .ring-outer  { animation: spin-cw  120s linear infinite; }
        .ring-middle { animation: spin-ccw  80s linear infinite; }
        .ring-inner  { animation: spin-cw   45s linear infinite; }
        .core        { transform-origin: 250px 250px;
                       animation: core-pulse 6s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) {
          .ring-outer, .ring-middle, .ring-inner, .core { animation: none; }
        }
      `}</style>

      {/* Hero composition */}
      <div className="absolute inset-0 flex items-center justify-center">
        <svg
          viewBox="0 0 500 500"
          className="h-[min(90vh,90vw)] w-[min(90vh,90vw)] text-[#F4F1EA]"
          aria-hidden="true"
        >
          <Ring radius={230} glyphs={LANGUAGE} fontSize={14} className="ring-outer" />
          <Ring radius={175} glyphs={GENETICS} fontSize={13} className="ring-middle" />
          <Ring radius={120} glyphs={BINARY}   fontSize={11} className="ring-inner" />

          {/* Core */}
          <g className="core">
            <circle cx={250} cy={250} r={42} fill="#E63946" />
            <circle cx={250} cy={250} r={42} fill="none" stroke="#F4F1EA" strokeWidth={1} strokeOpacity={0.4} />
          </g>
        </svg>
      </div>

      {/* Type */}
      <div className="pointer-events-none relative z-10 mx-auto flex min-h-[calc(100vh-3.5rem)] max-w-5xl flex-col justify-between px-8 py-12">
        <header className="flex items-center justify-between text-[11px] uppercase tracking-[0.3em] opacity-70">
          <span>Human / Code</span>
          <span>001 — Ø</span>
        </header>

        <footer className="space-y-6">
          <h1 className="font-mono text-5xl font-light leading-[0.95] tracking-tight md:text-7xl">
            We are <br /> written.
          </h1>
          <p className="max-w-sm text-sm leading-relaxed opacity-70">
            Language, genome, machine — three alphabets, one signal. A study in
            the geometry of what makes us legible.
          </p>
        </footer>
      </div>
    </div>
  );
}
