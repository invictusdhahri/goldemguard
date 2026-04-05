"use client";

import { useCallback, useEffect, useRef, useState, type RefObject } from "react";

const PX = 8;

const C = {
  skin: "#C9A882",
  skinDark: "#A07A4A",
  skinShadow: "#8B6B3E",
  skinLight: "#D4BC9A",
  browDark: "#5C4A38",
  eyeWhite: "#FFFFFF",
  eyeGreen: "#6EAE3C",
  eyeGreenDark: "#3D8A1E",
  eyePupil: "#0A0A0A",
  nose: "#B0885A",
  noseDark: "#8E6A3E",
  noseLight: "#C8A06E",
  robe: "#8B6B14",
  robeDark: "#6E5410",
  robeLight: "#A68028",
  robeShadow: "#4A3A0E",
  iron: "#A0A0A8",
  ironDark: "#6A6A72",
  ironLight: "#C4C4CC",
  ironEdge: "#4A4A52",
  ironBright: "#DCDCE4",
} as const;

type Angles = { rx: number; ry: number };

function toAngles(
  mx: number,
  my: number,
  cx: number,
  cy: number,
  depth: number,
  max: number,
): Angles {
  const clamp = (v: number) => Math.max(-max, Math.min(max, v));
  return {
    rx: clamp((-Math.atan2(my - cy, depth) * 180) / Math.PI),
    ry: clamp((Math.atan2(mx - cx, depth) * 180) / Math.PI),
  };
}

function Eye3D({
  angles,
  socketRef,
}: {
  angles: Angles;
  socketRef: RefObject<HTMLDivElement | null>;
}) {
  const sz = PX * 2;
  return (
    <div
      ref={socketRef}
      style={{
        width: sz,
        height: sz,
        background: C.eyeWhite,
        border: `2px solid ${C.browDark}`,
        position: "relative",
        overflow: "hidden",
        flexShrink: 0,
        perspective: "80px",
        perspectiveOrigin: "50% 50%",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          transformStyle: "preserve-3d",
          transform: `rotateX(${angles.rx}deg) rotateY(${angles.ry}deg)`,
          transition: "transform 0.1s ease-out",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: `radial-gradient(circle at 45% 45%, ${C.eyeGreen} 35%, ${C.eyeGreenDark} 100%)`,
            transform: "translateZ(-2px)",
          }}
        />
        <div
          style={{
            position: "absolute",
            width: 5,
            height: 7,
            left: "50%",
            top: "50%",
            marginLeft: -2.5,
            marginTop: -3.5,
            background: C.eyePupil,
            transform: "translateZ(5px)",
            boxShadow: "inset 1px 1px 0 rgba(255,255,255,0.3)",
          }}
        />
      </div>
    </div>
  );
}

export default function GuardVillager() {
  const containerRef = useRef<HTMLDivElement>(null);
  const leftRef = useRef<HTMLDivElement>(null);
  const rightRef = useRef<HTMLDivElement>(null);
  const [leftEye, setLeftEye] = useState<Angles>({ rx: 0, ry: 0 });
  const [rightEye, setRightEye] = useState<Angles>({ rx: 0, ry: 0 });
  const [tilt, setTilt] = useState<Angles>({ rx: 0, ry: 0 });

  const onMove = useCallback((mx: number, my: number) => {
    for (const [el, set] of [
      [leftRef.current, setLeftEye],
      [rightRef.current, setRightEye],
    ] as const) {
      if (!el) continue;
      const r = el.getBoundingClientRect();
      set(toAngles(mx, my, r.left + r.width / 2, r.top + r.height / 2, 260, 25));
    }
    if (containerRef.current) {
      const r = containerRef.current.getBoundingClientRect();
      const a = toAngles(mx, my, r.left + r.width / 2, r.top + r.height * 0.28, 500, 10);
      setTilt({ rx: a.rx * 0.35, ry: a.ry * 0.45 });
    }
  }, []);

  useEffect(() => {
    const h = (e: MouseEvent) => onMove(e.clientX, e.clientY);
    window.addEventListener("mousemove", h, { passive: true });
    return () => window.removeEventListener("mousemove", h);
  }, [onMove]);

  const CX = 90;
  const headW = 8 * PX; // 64
  const headH = 8 * PX; // 64
  const headX = CX - headW / 2; // 58
  const headY = 18;

  const bodyW = headW + 8; // 72 — robe slightly wider than head
  const bodyH = 17 * PX; // 136
  const bodyX = CX - bodyW / 2; // 54
  const bodyY = headY + headH; // 82

  return (
    <div
      ref={containerRef}
      className="select-none pointer-events-none"
      style={{
        width: 180,
        imageRendering: "pixelated",
        filter: "drop-shadow(0 10px 28px rgba(0,0,0,0.35))",
      }}
    >
      <div
        style={{
          position: "relative",
          width: 180,
          height: 280,
          perspective: "800px",
          perspectiveOrigin: "50% 28%",
        }}
      >
        <div
          style={{
            width: "100%",
            height: "100%",
            position: "relative",
            transform: `rotateX(${tilt.rx}deg) rotateY(${tilt.ry}deg)`,
            transformStyle: "preserve-3d",
            transition: "transform 0.12s ease-out",
          }}
        >
          {/* ═══ IRON HELMET ═══ */}
          <div
            style={{
              position: "absolute",
              top: 0,
              left: headX - 4,
              width: headW + 8,
              height: 12,
              background: `linear-gradient(180deg, ${C.ironBright}, ${C.iron}, ${C.ironDark})`,
              border: `2px solid ${C.ironEdge}`,
              zIndex: 5,
            }}
          />
          <div
            style={{
              position: "absolute",
              top: 10,
              left: headX - 10,
              width: headW + 20,
              height: 10,
              background: `linear-gradient(180deg, ${C.ironDark}, ${C.ironEdge})`,
              border: `2px solid ${C.ironEdge}`,
              zIndex: 6,
            }}
          />

          {/* ═══ HEAD ═══ */}
          <div
            style={{
              position: "absolute",
              top: headY,
              left: headX,
              width: headW,
              height: headH,
              background: C.skin,
              boxShadow: `inset 0 0 0 2px ${C.browDark}`,
              zIndex: 3,
              overflow: "visible",
            }}
          >
            {/* Forehead darker strip */}
            <div
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: PX,
                background: C.skinDark,
              }}
            />
            {/* Unibrow */}
            <div
              style={{
                position: "absolute",
                top: PX,
                left: 0,
                width: "100%",
                height: PX,
                background: C.browDark,
              }}
            />

            {/* Eyes row: 1PX skin | 2PX eye | 2PX gap | 2PX eye | 1PX skin */}
            <div
              style={{
                position: "absolute",
                top: PX * 2,
                left: 0,
                width: "100%",
                height: PX * 2,
                display: "flex",
              }}
            >
              <div style={{ width: PX, height: PX * 2, background: C.skin, flexShrink: 0 }} />
              <Eye3D angles={leftEye} socketRef={leftRef} />
              <div style={{ width: PX * 2, height: PX * 2, background: C.skin, flexShrink: 0 }} />
              <Eye3D angles={rightEye} socketRef={rightRef} />
              <div style={{ width: PX, height: PX * 2, background: C.skin, flexShrink: 0 }} />
            </div>

            {/* Lower face skin */}
            <div
              style={{
                position: "absolute",
                top: PX * 4,
                left: 0,
                width: "100%",
                height: PX * 3,
                background: C.skin,
              }}
            />
            {/* Chin shadow */}
            <div
              style={{
                position: "absolute",
                bottom: 0,
                left: 0,
                width: "100%",
                height: PX,
                background: C.skinDark,
              }}
            />

            {/* ═══ NOSE (3D protrusion — the iconic villager feature) ═══ */}
            <div
              style={{
                position: "absolute",
                top: PX * 3,
                left: "50%",
                transform: "translateX(-50%)",
                width: PX * 2 + 6,
                height: PX * 4,
                zIndex: 10,
                display: "flex",
              }}
            >
              {/* Left face — darker (3D depth cue) */}
              <div style={{ width: 5, background: C.noseDark }} />
              {/* Front face */}
              <div
                style={{
                  flex: 1,
                  background: `linear-gradient(180deg, ${C.noseLight}, ${C.nose} 50%, ${C.noseDark})`,
                  borderTop: `2px solid ${C.nose}`,
                  borderBottom: `2px solid ${C.noseDark}`,
                }}
              />
              {/* Right face — lighter highlight */}
              <div style={{ width: 4, background: C.noseLight }} />
            </div>
            {/* Nose bottom shadow */}
            <div
              style={{
                position: "absolute",
                top: PX * 7,
                left: "50%",
                transform: "translateX(-50%)",
                width: PX * 2 + 6,
                height: 3,
                background: C.skinShadow,
                zIndex: 10,
              }}
            />
          </div>

          {/* ═══ BODY / ROBE ═══ */}
          <div
            style={{
              position: "absolute",
              top: bodyY,
              left: bodyX,
              width: bodyW,
              height: bodyH,
              background: `linear-gradient(180deg, ${C.robeLight} 0%, ${C.robe} 30%, ${C.robeDark} 85%, ${C.robeShadow} 100%)`,
              border: `2px solid ${C.robeShadow}`,
              zIndex: 1,
            }}
          >
            {/* Iron chestplate — upper portion only */}
            <div
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: "40%",
                background: `linear-gradient(180deg, ${C.ironLight}, ${C.iron} 50%, ${C.ironDark})`,
                borderBottom: `2px solid ${C.ironEdge}`,
              }}
            >
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  background:
                    "linear-gradient(135deg, rgba(255,255,255,0.15), transparent 40%)",
                }}
              />
              {/* Shield emblem */}
              <div
                style={{
                  position: "absolute",
                  top: 10,
                  left: "50%",
                  transform: "translateX(-50%)",
                  width: 24,
                  height: 28,
                  border: `2px solid ${C.ironEdge}`,
                  borderRadius: "3px 3px 50% 50%",
                  background:
                    "linear-gradient(180deg, rgba(167,139,250,0.3), rgba(6,182,212,0.2))",
                }}
              />
            </div>
            {/* Robe center seam */}
            <div
              style={{
                position: "absolute",
                top: "44%",
                left: "50%",
                transform: "translateX(-50%)",
                width: 2,
                height: "54%",
                background: C.robeShadow,
                opacity: 0.4,
              }}
            />
          </div>

          {/* ═══ ARMS / SLEEVES (folded across body — villager pose) ═══ */}
          <div
            style={{
              position: "absolute",
              top: bodyY + 4,
              left: bodyX - 4,
              width: 16,
              height: 64,
              background: `linear-gradient(180deg, ${C.ironDark}, ${C.robe} 50%, ${C.robeDark})`,
              border: `2px solid ${C.robeShadow}`,
              transform: "rotate(6deg)",
              zIndex: 2,
            }}
          />
          <div
            style={{
              position: "absolute",
              top: bodyY + 4,
              left: bodyX + bodyW - 12,
              width: 16,
              height: 64,
              background: `linear-gradient(180deg, ${C.ironDark}, ${C.robe} 50%, ${C.robeDark})`,
              border: `2px solid ${C.robeShadow}`,
              transform: "rotate(-6deg)",
              zIndex: 2,
            }}
          />
          {/* Folded hands in front */}
          <div
            style={{
              position: "absolute",
              top: bodyY + 50,
              left: "50%",
              transform: "translateX(-50%)",
              width: 28,
              height: 14,
              background: C.robe,
              border: `2px solid ${C.robeShadow}`,
              zIndex: 4,
            }}
          >
            {/* Skin peeking out */}
            <div
              style={{
                position: "absolute",
                bottom: 1,
                left: 3,
                width: 7,
                height: 4,
                background: C.skin,
              }}
            />
            <div
              style={{
                position: "absolute",
                bottom: 1,
                right: 3,
                width: 7,
                height: 4,
                background: C.skin,
              }}
            />
          </div>

          {/* ═══ FEET ═══ */}
          <div
            style={{
              position: "absolute",
              top: bodyY + bodyH,
              left: CX - 18,
              width: 14,
              height: 10,
              background: `linear-gradient(180deg, ${C.robeDark}, #3a3a22)`,
              border: `2px solid ${C.robeShadow}`,
            }}
          />
          <div
            style={{
              position: "absolute",
              top: bodyY + bodyH,
              left: CX + 4,
              width: 14,
              height: 10,
              background: `linear-gradient(180deg, ${C.robeDark}, #3a3a22)`,
              border: `2px solid ${C.robeShadow}`,
            }}
          />
        </div>
      </div>
    </div>
  );
}
