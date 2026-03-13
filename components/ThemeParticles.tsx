"use client";

import { useEffect, useRef } from "react";

interface Particle {
  x: number;
  y: number;
  size: number;
  speed: number;
  opacity: number;
  wobble: number;
  wobbleSpeed: number;
  phase: number;
}

const PARTICLE_COUNT = 30;

function createParticle(canvasW: number, canvasH: number, randomY: boolean, blue: boolean): Particle {
  return {
    x: Math.random() * canvasW,
    y: randomY ? Math.random() * canvasH : blue ? -10 : canvasH + 10,
    size: 2 + Math.random() * 4,
    speed: 0.3 + Math.random() * 0.7,
    opacity: 0.08 + Math.random() * 0.18,
    wobble: Math.random() * 2,
    wobbleSpeed: 0.005 + Math.random() * 0.015,
    phase: Math.random() * Math.PI * 2,
  };
}

export default function ThemeParticles() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);
  const particlesRef = useRef<Particle[]>([]);
  const themeRef = useRef<string>("blue-light");

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    function resize() {
      if (!canvas) return;
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }

    resize();
    window.addEventListener("resize", resize);

    // Initialize particles spread across the canvas
    const initialBlue = !document.documentElement.getAttribute("data-theme")?.startsWith("red");
    particlesRef.current = Array.from({ length: PARTICLE_COUNT }, () =>
      createParticle(canvas.width, canvas.height, true, initialBlue)
    );

    // Watch for theme changes
    const observer = new MutationObserver(() => {
      themeRef.current =
        document.documentElement.getAttribute("data-theme") || "blue-light";
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });
    themeRef.current =
      document.documentElement.getAttribute("data-theme") || "blue-light";

    let time = 0;

    function animate() {
      if (!canvas || !ctx) return;

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const blue = themeRef.current.startsWith("blue");
      const dark = themeRef.current.endsWith("dark");

      time += 1;

      particlesRef.current.forEach((p) => {
        // Movement direction: blue = fall down (snow), red = rise up (embers)
        if (blue) {
          p.y += p.speed;
        } else {
          p.y -= p.speed;
        }

        // Gentle horizontal wobble
        p.x += Math.sin(time * p.wobbleSpeed + p.phase) * p.wobble;

        // Wrap around edges
        if (blue && p.y > canvas.height + 10) {
          p.y = -10;
          p.x = Math.random() * canvas.width;
        } else if (!blue && p.y < -10) {
          p.y = canvas.height + 10;
          p.x = Math.random() * canvas.width;
        }

        // Horizontal wrapping
        if (p.x < -10) p.x = canvas.width + 10;
        if (p.x > canvas.width + 10) p.x = -10;

        // Draw particle
        ctx.save();
        ctx.globalAlpha = p.opacity;

        if (blue) {
          // Snowflake / ice crystal style
          const color = dark ? "rgba(147, 197, 253," : "rgba(59, 130, 246,";
          ctx.fillStyle = `${color} 1)`;
          ctx.beginPath();

          // Draw a simple 6-pointed star shape
          const r = p.size;
          for (let i = 0; i < 6; i++) {
            const angle = (Math.PI / 3) * i - Math.PI / 2;
            const outerX = p.x + Math.cos(angle) * r;
            const outerY = p.y + Math.sin(angle) * r;
            const innerAngle = angle + Math.PI / 6;
            const innerX = p.x + Math.cos(innerAngle) * (r * 0.4);
            const innerY = p.y + Math.sin(innerAngle) * (r * 0.4);

            if (i === 0) {
              ctx.moveTo(outerX, outerY);
            } else {
              ctx.lineTo(outerX, outerY);
            }
            ctx.lineTo(innerX, innerY);
          }
          ctx.closePath();
          ctx.fill();
        } else {
          // Ember / fire particle style
          const color = dark ? "rgba(251, 146, 60," : "rgba(239, 68, 68,";

          // Glowing circle with soft edge
          const grad = ctx.createRadialGradient(
            p.x,
            p.y,
            0,
            p.x,
            p.y,
            p.size
          );
          grad.addColorStop(0, `${color} 1)`);
          grad.addColorStop(0.4, `${color} 0.6)`);
          grad.addColorStop(1, `${color} 0)`);

          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.restore();
      });

      animFrameRef.current = requestAnimationFrame(animate);
    }

    animate();

    return () => {
      cancelAnimationFrame(animFrameRef.current);
      window.removeEventListener("resize", resize);
      observer.disconnect();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
        zIndex: 0,
      }}
    />
  );
}
