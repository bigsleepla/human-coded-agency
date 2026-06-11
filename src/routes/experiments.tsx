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
  // bounds for wrap-around
  spanX: number;
};

const CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

function makeCloud(scale: number): CloudBank {
  const particles: Particle[] = [];
  // Each cloud is a few overlapping blobs
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
  const count = Math.floor((140 + Math.random() * 120) * scale);

  let minX = Infinity;
  let maxX = -Infinity;

  for (let i = 0; i < count; i++) {
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
    const oy = chosen.y + Math.sin(angle) * radius * 0.7;

    if (ox < minX) minX = ox;
    if (ox > maxX) maxX = ox;

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
      rot: (Math.random() - 0