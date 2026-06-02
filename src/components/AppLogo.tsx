import { LOGO_ICON, LOGO_WORDMARK } from "../theme";

type AppLogoProps = {
  variant?: "icon" | "wordmark";
  size?: number;
  alt?: string;
  style?: React.CSSProperties;
};

export function AppLogo({ variant = "icon", size = 44, alt = "Track Your Workout", style }: AppLogoProps) {
  const src = variant === "wordmark" ? LOGO_WORDMARK : LOGO_ICON;

  return (
    <img
      src={src}
      alt={alt}
      width={size}
      height={variant === "wordmark" ? undefined : size}
      style={{
        display: "block",
        width: size,
        height: variant === "wordmark" ? "auto" : size,
        objectFit: "contain",
        ...style,
      }}
    />
  );
}
