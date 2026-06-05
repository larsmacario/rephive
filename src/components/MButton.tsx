import { useMemo, useState, type ButtonHTMLAttributes, type CSSProperties } from "react";
import { buttonBase, buttonSizes, M, type ButtonSizeToken } from "../theme";
import { prefersReducedMotion, triggerTapHaptic } from "../lib/haptics";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = ButtonSizeToken;

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
  primary: { background: M.acc, color: M.accInk, borderColor: "transparent", fontFamily: M.disp },
  secondary: { background: "transparent", color: M.fg, borderColor: M.line },
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
  const isDisabled = Boolean(disabled || loading);
  const reducedMotion = useMemo(() => prefersReducedMotion(), []);
  const pressStyle = reducedMotion || !pressed || isDisabled ? null : { transform: "scale(0.97)", opacity: 0.92 };

  const handlePointerDown: MButtonProps["onPointerDown"] = async (event) => {
    onPointerDown?.(event);
    if (isDisabled) return;
    setPressed(true);
    if (haptic && variant !== "ghost") void triggerTapHaptic();
  };

  const handlePointerUp: MButtonProps["onPointerUp"] = (event) => {
    onPointerUp?.(event);
    setPressed(false);
  };

  const handlePointerCancel: MButtonProps["onPointerCancel"] = (event) => {
    onPointerCancel?.(event);
    setPressed(false);
  };

  const handlePointerLeave: MButtonProps["onPointerLeave"] = (event) => {
    onPointerLeave?.(event);
    setPressed(false);
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
        ...(isDisabled ? { opacity: 0.45, cursor: loading ? "wait" : "not-allowed" } : null),
        ...(pressStyle ?? null),
        ...style,
      }}
    />
  );
}
