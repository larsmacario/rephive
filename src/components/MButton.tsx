import { useEffect, useMemo, useRef, useState, type ButtonHTMLAttributes, type CSSProperties } from "react";
import {
  buttonBase,
  buttonPressStyle,
  buttonReleaseGlowStyle,
  buttonSizes,
  brandButtonStyle,
  M,
  type ButtonSizeToken,
  type ButtonVariantToken,
} from "../theme";
import { prefersReducedMotion, triggerTapHaptic } from "../lib/haptics";

type ButtonVariant = ButtonVariantToken;
type ButtonSize = ButtonSizeToken;

const PRIMARY_RELEASE_GLOW_MS = 180;

export interface MButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "style"> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  loading?: boolean;
  haptic?: boolean;
  style?: CSSProperties;
}

const BASE_STYLE = buttonBase;
const SIZE_STYLE = buttonSizes;

const VARIANT_STYLE: Record<ButtonVariant, CSSProperties> = {
  primary: brandButtonStyle(),
  secondary: { background: "transparent", color: M.fg, borderColor: M.brandBorder },
  ghost: { background: "transparent", color: M.mut, borderColor: "transparent" },
  danger: { background: "transparent", color: "#f5b4b4", borderColor: "rgba(245,180,180,.35)" },
};

export function MButton({
  variant = "primary",
  size = "md",
  fullWidth = false,
  loading = false,
  haptic = true,
  disabled,
  onClick,
  onPointerDown,
  onPointerUp,
  onPointerCancel,
  onPointerLeave,
  style,
  ...props
}: MButtonProps) {
  const [pressed, setPressed] = useState(false);
  const [releasing, setReleasing] = useState(false);
  const releaseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isDisabled = Boolean(disabled || loading);
  const reducedMotion = useMemo(() => prefersReducedMotion(), []);

  const clearReleaseTimer = () => {
    if (releaseTimerRef.current !== null) {
      clearTimeout(releaseTimerRef.current);
      releaseTimerRef.current = null;
    }
  };

  useEffect(() => () => clearReleaseTimer(), []);

  const pressStyle =
    isDisabled || !pressed ? null : buttonPressStyle(variant, true, { reducedMotion });

  const releaseStyle =
    !isDisabled && releasing && variant === "primary" && !reducedMotion
      ? buttonReleaseGlowStyle()
      : null;

  const startReleaseGlow = () => {
    if (variant !== "primary" || reducedMotion || isDisabled) return;
    clearReleaseTimer();
    setReleasing(true);
    releaseTimerRef.current = setTimeout(() => {
      setReleasing(false);
      releaseTimerRef.current = null;
    }, PRIMARY_RELEASE_GLOW_MS);
  };

  const handlePointerDown: MButtonProps["onPointerDown"] = async (event) => {
    onPointerDown?.(event);
    if (isDisabled) return;
    clearReleaseTimer();
    setReleasing(false);
    setPressed(true);
    if (haptic && variant === "primary") void triggerTapHaptic();
  };

  const handlePointerUp: MButtonProps["onPointerUp"] = (event) => {
    onPointerUp?.(event);
    if (pressed) startReleaseGlow();
    setPressed(false);
  };

  const handlePointerCancel: MButtonProps["onPointerCancel"] = (event) => {
    onPointerCancel?.(event);
    setPressed(false);
    setReleasing(false);
    clearReleaseTimer();
  };

  const handlePointerLeave: MButtonProps["onPointerLeave"] = (event) => {
    onPointerLeave?.(event);
    setPressed(false);
    setReleasing(false);
    clearReleaseTimer();
  };

  const handleClick: MButtonProps["onClick"] = (event) => {
    if (isDisabled) return;
    onClick?.(event);
  };

  return (
    <button
      {...props}
      disabled={isDisabled}
      onClick={handleClick}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      onPointerLeave={handlePointerLeave}
      style={{
        ...BASE_STYLE,
        ...SIZE_STYLE[size],
        ...VARIANT_STYLE[variant],
        ...(fullWidth ? { width: "100%" } : null),
        ...(isDisabled
          ? { opacity: 0.45, cursor: loading ? "wait" : "not-allowed", boxShadow: "none" }
          : null),
        ...(releaseStyle ?? null),
        ...(pressStyle ?? null),
        ...style,
      }}
    />
  );
}
