import React, { useRef, useEffect, useCallback } from 'react';
import { ContainerType, MatterState, ContainerData, Particle } from '../types';

interface SimulationCanvasProps {
  containers: ContainerData[];
  selectedId: number | null;
  onSelect: (id: number) => void;
}

export const SimulationCanvas: React.FC<SimulationCanvasProps> = ({
  containers,
  selectedId,
  onSelect,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>(0);
  
  // Animation state
  const simStateRef = useRef<{
    waterLevels: number[]; // Target 0 to 1
    currentWaterLevels: number[]; // Current animation value 0 to 1
    particles: Particle[][];
    containerBounds: { id: number; x: number; y: number; w: number; h: number }[];
  }>({
    waterLevels: containers.map(() => 0),
    currentWaterLevels: containers.map(() => 0),
    particles: containers.map(() => []),
    containerBounds: [],
  });

  const COLORS = {
    // Glass colors - more visible now
    glassBorder: 'rgba(100, 130, 160, 0.5)', // Darker stroke for definition
    glassInnerStroke: 'rgba(100, 130, 160, 0.2)', // Back lines
    glassFill: 'rgba(220, 240, 255, 0.2)', // Slight blue tint for volume
    glassHighlight: 'rgba(255, 255, 255, 0.6)', // Shine
    
    // Contents
    waterFill: 'rgba(59, 130, 246, 0.5)',
    waterSurface: 'rgba(147, 197, 253, 0.8)',
    waterStroke: 'rgba(37, 99, 235, 0.3)',
    rock: '#57534e',
    rockLight: '#a8a29e',
    gasParticles: ['#ef4444', '#f59e0b', '#10b981', '#8b5cf6'],
    selectionGlow: 'rgba(250, 204, 21, 0.4)',
  };

  // Initialize particles and water targets
  useEffect(() => {
    const state = simStateRef.current;
    
    containers.forEach((c, index) => {
      // Liquid
      state.waterLevels[index] = c.matter === MatterState.LIQUID ? 0.7 : 0;

      // Gas
      if (c.matter === MatterState.GAS) {
        if (state.particles[index].length === 0) {
          const newParticles = [];
          for (let i = 0; i < 40; i++) {
            newParticles.push({
              x: 0, y: 0, // Will be set in draw loop
              vx: (Math.random() - 0.5) * 3,
              vy: (Math.random() - 0.5) * 3,
              radius: 4 + Math.random() * 4,
              color: COLORS.gasParticles[Math.floor(Math.random() * COLORS.gasParticles.length)],
            });
          }
          state.particles[index] = newParticles;
        }
      } else {
        state.particles[index] = [];
      }
    });
  }, [containers, COLORS.gasParticles]);

  // --- Drawing Helpers ---

  // 1. CUBE (Glass Tank)
  const drawCube = (
    ctx: CanvasRenderingContext2D, 
    x: number, y: number, w: number, h: number, 
    matter: MatterState, 
    waterLevel: number,
    particles: Particle[]
  ) => {
    const depth = w * 0.3;
    const pad = 10;
    
    // Front face coordinates
    const fx = x + pad; 
    const fy = y + pad + depth/2;
    const fw = w - pad*2;
    const fh = h - pad*2 - depth/2;
    
    // Back face coordinates
    const bx = fx + depth/2;
    const by = fy - depth/2;
    // Back face width/height are same as front
    
    // --- 1. Draw Inner Glass Structure (Back & Floor) ---
    // Floor (connect bottom of back to bottom of front)
    ctx.fillStyle = COLORS.glassFill;
    ctx.beginPath();
    ctx.moveTo(fx, fy + fh);
    ctx.lineTo(bx, by + fh);
    ctx.lineTo(bx + fw, by + fh);
    ctx.lineTo(fx + fw, fy + fh);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = COLORS.glassInnerStroke;
    ctx.stroke();

    // Back Wall
    ctx.fillStyle = COLORS.glassFill;
    ctx.fillRect(bx, by, fw, fh);
    ctx.strokeRect(bx, by, fw, fh);
    
    // Side Walls connecting lines (Inner)
    ctx.beginPath();
    ctx.moveTo(fx, fy); ctx.lineTo(bx, by); // Top Left
    ctx.moveTo(fx + fw, fy); ctx.lineTo(bx + fw, by); // Top Right
    ctx.stroke();

    // --- 2. Draw Contents ---
    if (matter === MatterState.SOLID) {
      // Rock sits on the floor (back-weighted for perspective)
      drawRock(ctx, bx + fw/2 - 20, by + fh - 35, 60);
    } else if (matter === MatterState.LIQUID) {
      const lh = fh * waterLevel;
      const lfy = fy + fh - lh; // Liquid Front Y
      const lby = by + fh - lh; // Liquid Back Y
      
      ctx.fillStyle = COLORS.waterFill;
      
      // Liquid Volume (Front + Top + Side)
      // Front Face
      ctx.beginPath();
      ctx.moveTo(fx, fy + fh);
      ctx.lineTo(fx + fw, fy + fh);
      ctx.lineTo(fx + fw, lfy);
      ctx.lineTo(fx, lfy);
      ctx.fill();

      // Top Surface
      ctx.fillStyle = COLORS.waterSurface;
      ctx.beginPath();
      ctx.moveTo(fx, lfy);
      ctx.lineTo(fx + fw, lfy);
      ctx.lineTo(bx + fw, lby);
      ctx.lineTo(bx, lby);
      ctx.closePath();
      ctx.fill();
      
      // Side Fill (Right visible side)
      ctx.fillStyle = COLORS.waterStroke;
      ctx.beginPath();
      ctx.moveTo(fx + fw, fy + fh);
      ctx.lineTo(bx + fw, by + fh);
      ctx.lineTo(bx + fw, lby);
      ctx.lineTo(fx + fw, lfy);
      ctx.fill();
    } else if (matter === MatterState.GAS) {
      updateParticles(ctx, particles, fx, fy, fw, fh, 'RECT');
    }

    // --- 3. Draw Outer Glass Structure (Front) ---
    // Front Face Frame
    ctx.lineWidth = 2;
    ctx.strokeStyle = COLORS.glassBorder;
    ctx.strokeRect(fx, fy, fw, fh);
    
    // Connect outer frame corners
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(fx, fy + fh); ctx.lineTo(bx, by + fh); // Bottom Left
    ctx.moveTo(fx + fw, fy + fh); ctx.lineTo(bx + fw, by + fh); // Bottom Right
    ctx.stroke();

    // Reflections (Diagonal streaks on front face)
    ctx.fillStyle = COLORS.glassHighlight;
    ctx.beginPath();
    ctx.moveTo(fx + fw - 30, fy + 10);
    ctx.lineTo(fx + fw - 10, fy + 10);
    ctx.lineTo(fx + fw - 10, fy + 50);
    ctx.lineTo(fx + fw - 40, fy + 50);
    ctx.closePath();
    ctx.fill();
  };

  // 2. CYLINDER (Beaker/Jar)
  const drawCylinder = (
    ctx: CanvasRenderingContext2D, 
    x: number, y: number, w: number, h: number, 
    matter: MatterState, 
    waterLevel: number,
    particles: Particle[]
  ) => {
    // Narrower width for a "tall jar" look within the square bounds
    const jw = w * 0.7; 
    const jx = x + (w - jw) / 2;
    const rx = jw / 2;
    const ry = 12; // Ellipse height radius

    // Top and Bottom Centers
    const ty = y + ry + 10;
    const by = y + h - ry - 5;
    
    // Center X
    const cx = jx + rx;

    // --- 1. Draw Inner/Back Glass ---
    // Bottom Ellipse (Full base)
    ctx.fillStyle = COLORS.glassFill;
    ctx.strokeStyle = COLORS.glassInnerStroke;
    ctx.lineWidth = 1;
    
    ctx.beginPath();
    ctx.ellipse(cx, by, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke(); // Draw full bottom ellipse weakly

    // Body Fill (Back)
    ctx.fillRect(jx, ty, jw, by - ty);

    // Top Ellipse (Back half)
    ctx.beginPath();
    ctx.ellipse(cx, ty, rx, ry, 0, Math.PI, 2 * Math.PI);
    ctx.stroke();

    // --- 2. Contents ---
    if (matter === MatterState.SOLID) {
      drawRock(ctx, cx - 10, by - 30, 50);
    } else if (matter === MatterState.LIQUID) {
      const cylH = by - ty;
      const lh = cylH * waterLevel;
      const ly = by - lh;
      
      // Liquid Body
      ctx.fillStyle = COLORS.waterFill;
      ctx.beginPath();
      // Bottom cap
      ctx.ellipse(cx, by, rx, ry, 0, 0, Math.PI * 2);
      ctx.fill();
      // Sides
      ctx.beginPath();
      ctx.moveTo(jx, by);
      ctx.lineTo(jx + jw, by);
      ctx.lineTo(jx + jw, ly);
      ctx.lineTo(jx, ly);
      ctx.fill();

      // Liquid Surface
      ctx.fillStyle = COLORS.waterSurface;
      ctx.beginPath();
      ctx.ellipse(cx, ly, rx, ry, 0, 0, Math.PI * 2);
      ctx.fill();
    } else if (matter === MatterState.GAS) {
      updateParticles(ctx, particles, jx, ty, jw, by - ty, 'RECT');
    }

    // --- 3. Outer Glass (Front) ---
    ctx.lineWidth = 2;
    ctx.strokeStyle = COLORS.glassBorder;

    // Sides
    ctx.beginPath();
    ctx.moveTo(jx, ty); ctx.lineTo(jx, by);
    ctx.moveTo(jx + jw, ty); ctx.lineTo(jx + jw, by);
    ctx.stroke();

    // Bottom Front Rim
    ctx.beginPath();
    ctx.ellipse(cx, by, rx, ry, 0, 0, Math.PI);
    ctx.stroke();

    // Top Rim (Full)
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(cx, ty, rx, ry, 0, 0, Math.PI * 2);
    ctx.stroke();

    // Highlights
    ctx.strokeStyle = COLORS.glassHighlight;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(jx + 10, ty + 15);
    ctx.lineTo(jx + 10, by - 15);
    ctx.stroke();
  };

  // 3. SPHERE (Fishbowl)
  const drawSphere = (
    ctx: CanvasRenderingContext2D, 
    x: number, y: number, w: number, h: number, 
    matter: MatterState, 
    waterLevel: number,
    particles: Particle[]
  ) => {
    const cx = x + w/2;
    const cy = y + h/2 + 10;
    const r = w/2 - 10;
    
    // Top Opening
    const openR = r * 0.6;
    const openRy = openR * 0.25;
    const openY = cy - r + 5; 

    // --- 1. Glass Body (Back/Fill) ---
    ctx.fillStyle = COLORS.glassFill;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.lineWidth = 1;
    ctx.strokeStyle = COLORS.glassInnerStroke;
    ctx.stroke();

    // --- 2. Contents ---
    if (matter === MatterState.SOLID) {
      drawRock(ctx, cx - 15, cy + r - 40, 50);
    } else if (matter === MatterState.LIQUID) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.clip();

      const lh = (2 * r) * waterLevel; 
      const wy = (cy + r) - lh;
      
      ctx.fillStyle = COLORS.waterFill;
      ctx.fillRect(x, wy, w, lh);

      // Surface ellipse
      const distFromCenter = Math.abs(cy - wy);
      const surfaceR = Math.sqrt(r*r - distFromCenter*distFromCenter);
      
      if (!isNaN(surfaceR) && surfaceR > 0) {
        ctx.fillStyle = COLORS.waterSurface;
        ctx.beginPath();
        ctx.ellipse(cx, wy, surfaceR, surfaceR * 0.3, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    } else if (matter === MatterState.GAS) {
      updateParticles(ctx, particles, cx, cy, r, r, 'CIRCLE');
    }

    // --- 3. Glass Details (Front) ---
    ctx.lineWidth = 2;
    ctx.strokeStyle = COLORS.glassBorder;
    
    // Main outline (skip top where opening is)
    // Approximate by drawing two arcs or just draw full and overlay opening
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();

    // Opening Rim
    ctx.fillStyle = 'rgba(255,255,255,0.1)'; // Slight fill for opening
    ctx.beginPath();
    ctx.ellipse(cx, openY, openR, openRy, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Shine (Curved highlight)
    ctx.beginPath();
    ctx.arc(cx, cy, r - 6, Math.PI * 1.2, Math.PI * 1.4);
    ctx.strokeStyle = COLORS.glassHighlight;
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.stroke();
    
    // Secondary Shine (Bottom right)
    ctx.beginPath();
    ctx.arc(cx, cy, r - 6, Math.PI * 0.2, Math.PI * 0.3);
    ctx.lineWidth = 2;
    ctx.stroke();
  };

  const drawRock = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = COLORS.rock;
    ctx.strokeStyle = '#292524';
    ctx.lineWidth = 2;
    
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(size * 0.3, -size * 0.2);
    ctx.lineTo(size * 0.6, 0);
    ctx.lineTo(size * 0.8, size * 0.4);
    ctx.lineTo(size * 0.5, size * 0.7);
    ctx.lineTo(size * 0.1, size * 0.5);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Facet Highlight
    ctx.fillStyle = COLORS.rockLight;
    ctx.beginPath();
    ctx.moveTo(size * 0.3, -size * 0.2);
    ctx.lineTo(size * 0.5, size * 0.2);
    ctx.lineTo(0, 0);
    ctx.fill();

    ctx.restore();
  };

  const updateParticles = (
    ctx: CanvasRenderingContext2D, 
    particles: Particle[], 
    bx: number, by: number, bw: number, bh: number,
    shape: 'RECT' | 'CIRCLE'
  ) => {
    particles.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;
      
      // Init Check
      if (p.x === 0 && p.y === 0) {
        if (shape === 'RECT') {
            p.x = bx + bw/2;
            p.y = by + bh/2;
        } else {
            p.x = bx; // center x for circle
            p.y = by; // center y for circle
        }
      }

      // Bounds
      if (shape === 'RECT') {
        if (p.x < bx + p.radius) { p.x = bx + p.radius; p.vx *= -1; }
        if (p.x > bx + bw - p.radius) { p.x = bx + bw - p.radius; p.vx *= -1; }
        if (p.y < by + p.radius) { p.y = by + p.radius; p.vy *= -1; }
        if (p.y > by + bh - p.radius) { p.y = by + bh - p.radius; p.vy *= -1; }
      } else if (shape === 'CIRCLE') {
        // bx, by is center, bw is radius
        const dx = p.x - bx;
        const dy = p.y - by;
        const dist = Math.sqrt(dx*dx + dy*dy);
        if (dist > bw - p.radius) {
          const nx = dx / dist;
          const ny = dy / dist;
          p.vx -= 2 * (p.vx * nx + p.vy * ny) * nx;
          p.vy -= 2 * (p.vx * nx + p.vy * ny) * ny;
          p.x = bx + nx * (bw - p.radius - 1);
          p.y = by + ny * (bw - p.radius - 1);
        }
      }

      ctx.beginPath();
      ctx.fillStyle = p.color;
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fill();
    });
  };

  // --- Main Draw Loop ---
  const drawScene = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    
    // Resize only if needed to avoid flicker or heavy logic
    if (canvas.width !== rect.width * dpr || canvas.height !== rect.height * dpr) {
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);
    } else {
      ctx.clearRect(0, 0, rect.width, rect.height);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0); // Reset transform and apply scale
    }

    const width = rect.width;
    const height = rect.height;

    // Draw Table
    const tableY = height * 0.7; // Lowered table horizon slightly
    // Wall Background
    const wallGradient = ctx.createLinearGradient(0, 0, 0, tableY);
    wallGradient.addColorStop(0, '#f0f9ff');
    wallGradient.addColorStop(1, '#e0f2fe');
    ctx.fillStyle = wallGradient;
    ctx.fillRect(0, 0, width, tableY);

    // Table Surface
    const tableGradient = ctx.createLinearGradient(0, tableY, 0, height);
    tableGradient.addColorStop(0, '#8D6E63');
    tableGradient.addColorStop(1, '#5D4037');
    ctx.fillStyle = tableGradient;
    ctx.fillRect(0, tableY, width, height - tableY);
    
    // Table Edge/Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.1)';
    ctx.fillRect(0, tableY, width, 5);

    // Layout
    const cSize = 140; // Base size for layout
    const gap = (width - (cSize * 3)) / 4;
    const yBase = tableY - cSize + 40; // Objects sit on table, slightly overlapping horizon for perspective

    const newBounds = containers.map((c, i) => ({
      id: c.id,
      x: gap + i * (cSize + gap),
      y: yBase,
      w: cSize,
      h: cSize,
    }));
    simStateRef.current.containerBounds = newBounds;

    newBounds.forEach((b, i) => {
      const container = containers[i];
      const state = simStateRef.current;

      // Update water animation
      const target = state.waterLevels[i];
      const current = state.currentWaterLevels[i];
      state.currentWaterLevels[i] = current + (target - current) * 0.05;

      // Selection Glow (Underneath)
      if (selectedId === container.id) {
        ctx.save();
        ctx.translate(b.x + b.w/2, b.y + b.h - 10);
        ctx.scale(1, 0.3);
        ctx.beginPath();
        ctx.arc(0, 0, b.w * 0.6, 0, Math.PI * 2);
        ctx.fillStyle = COLORS.selectionGlow;
        ctx.fill();
        ctx.restore();
      } else {
        // Normal Shadow
        ctx.save();
        ctx.translate(b.x + b.w/2, b.y + b.h - 10);
        ctx.scale(1, 0.3);
        ctx.beginPath();
        ctx.arc(0, 0, b.w * 0.5, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0,0,0,0.2)';
        ctx.fill();
        ctx.restore();
      }

      // Delegate to specific drawers
      if (container.type === ContainerType.CUBE) {
        drawCube(ctx, b.x, b.y, b.w, b.h, container.matter, state.currentWaterLevels[i], state.particles[i]);
      } else if (container.type === ContainerType.CYLINDER) {
        // Draw slightly taller for the "Tall Jar" look, extending up from the bottom
        const tallH = b.h * 1.2;
        const tallY = b.y + b.h - tallH;
        drawCylinder(ctx, b.x, tallY, b.w, tallH, container.matter, state.currentWaterLevels[i], state.particles[i]);
      } else if (container.type === ContainerType.SPHERE) {
        drawSphere(ctx, b.x, b.y, b.w, b.h, container.matter, state.currentWaterLevels[i], state.particles[i]);
      }

      // Label
      ctx.font = 'bold 18px "Comic Neue", sans-serif';
      ctx.fillStyle = '#1e293b';
      ctx.textAlign = 'center';
      ctx.fillText(container.label, b.x + b.w / 2, tableY + b.h * 0.6); // Position label lower on the table
    });

    requestRef.current = requestAnimationFrame(drawScene);
  }, [containers, selectedId, COLORS]);

  useEffect(() => {
    requestRef.current = requestAnimationFrame(drawScene);
    return () => cancelAnimationFrame(requestRef.current);
  }, [drawScene]);

  const handleClick = (e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    simStateRef.current.containerBounds.forEach(b => {
      // Loose hitbox for usability - extended height for tall jar
      if (x >= b.x - 10 && x <= b.x + b.w + 10 && y >= b.y - 40 && y <= b.y + b.h + 40) {
        onSelect(b.id);
      }
    });
  };

  return (
    <canvas
      ref={canvasRef}
      onClick={handleClick}
      className="w-full h-full cursor-pointer touch-none"
    />
  );
};
