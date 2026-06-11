import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/experiments")({
  component: ExperimentsPage,
});

// Three concentric rings, each carrying a different "human code".
// Outer: language (letters + numbers). Middle: genetics (A/T/C/G). Inner: machine (0/1).
// Pure SVG + CSS transforms — counter-rotating, GPU-friendly, near-zero memory.

const LANGUAGE = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789".split("");
const GENETICS = "ATCGATCGATCGATCGATCGATCGATCGATCG".split("");
const BINARY = "0101101