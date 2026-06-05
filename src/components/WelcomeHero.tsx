import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { LOGO_ICON, M } from "../theme";
const HEX_RING =
  "M280 70 L460 174 L460 386 L280 490 L100 386 L100 174 Z";

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return reduced;
}

type WelcomeHeroProps = {
  size?: number;
};

export function WelcomeHero({ size = 220 }: WelcomeHeroProps) {
  const reducedMotion = usePrefersReducedMotion();
  const ringTransition = reducedMotion
    ? { duration: 0 }
    : { duration: 1.5, ease: [0.5, 0, 0.2, 1] as const, delay: 0.25 };

  return (
    <div
      style={{
        width: size,
        height: size,
        position: "relative",
        flexShrink: 0,
      }}
      aria-hidden
    >
      <motion.div
        style={{ width: "100%", height: "100%", position: "relative" }}
        animate={reducedMotion ? undefined : { y: [0, -10, 0] }}
        transition={
          reducedMotion
            ? undefined
            : { duration: 6, ease: "easeInOut", repeat: Infinity, delay: 2 }
        }
      >
        <svg viewBox="0 0 560 560" width="100%" height="100%" aria-hidden>
          <path
            d="M280 36 L490 158 L490 402 L280 524 L70 402 L70 158 Z"
            fill={M.accSoft}
            stroke="rgba(126,246,123,.16)"
            strokeWidth={2}
          />
          <motion.path
            d={HEX_RING}
            fill="none"
            stroke={M.brand}
            strokeWidth={10}
            strokeLinejoin="round"
            strokeLinecap="round"
            initial={reducedMotion ? { pathLength: 1, opacity: 1 } : { pathLength: 0, opacity: 1 }}
            animate={{ pathLength: 1 }}
            transition={ringTransition}
            style={{ filter: "drop-shadow(0 0 14px color-mix(in oklab, var(--mom-brand, #7ef67b) 55%, transparent))" }}
          />
          <motion.path
            d="M280 150 L390 214 L390 346 L280 410 L170 346 L170 214 Z"
            fill={M.accSoft}
            stroke="rgba(126,246,123,.22)"
            strokeWidth={2}
            initial={reducedMotion ? { opacity: 1 } : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={reducedMotion ? { duration: 0 } : { duration: 0.9, delay: 1 }}
          />
          {[
            { cx: 460, cy: 174, delay: 1.5 },
            { cx: 460, cy: 386, delay: 1.62 },
            { cx: 280, cy: 490, delay: 1.74 },
          ].map((dot) => (
            <motion.circle
              key={`${dot.cx}-${dot.cy}`}
              cx={dot.cx}
              cy={dot.cy}
              r={11}
              fill={M.brand}
              initial={reducedMotion ? { opacity: 1 } : { opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={reducedMotion ? { duration: 0 } : { duration: 0.6, delay: dot.delay }}
            />
          ))}
        </svg>
        <div
          style={{
            position: "absolute",
            top: "49%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: "48%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <motion.img
            src={LOGO_ICON}
            alt=""
            style={{
              width: "100%",
              height: "auto",
              display: "block",
              filter: "drop-shadow(0 0 18px color-mix(in oklab, var(--mom-brand, #7ef67b) 45%, transparent))",
            }}
            initial={reducedMotion ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.7 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={
              reducedMotion
                ? { duration: 0 }
                : { duration: 0.85, ease: [0.34, 1.56, 0.64, 1], delay: 1.05 }
            }
          />
        </div>
      </motion.div>
    </div>
  );
}
