import type { CSSProperties } from "react";
import { M } from "../theme";
import { getAvatarPublicUrl } from "../lib/avatar";

export interface UserAvatarProps {
  size: number;
  displayName?: string | null;
  avatarPath?: string | null;
  onClick?: () => void;
  style?: CSSProperties;
  className?: string;
  /** Cache-bust when avatar was just updated */
  cacheKey?: string | number;
}

function getInitial(displayName?: string | null): string {
  const name = displayName?.trim();
  return (name ? name.charAt(0) : "A").toUpperCase();
}

export function UserAvatar({
  size,
  displayName,
  avatarPath,
  onClick,
  style,
  className,
  cacheKey,
}: UserAvatarProps) {
  const radius = size / 2;
  const fontSize = Math.round(size * 0.47);
  const initial = getInitial(displayName);

  const baseStyle: CSSProperties = {
    width: size,
    height: size,
    borderRadius: radius,
    border: "1px solid " + M.line,
    flexShrink: 0,
    overflow: "hidden",
    ...style,
  };

  if (avatarPath) {
    const url = getAvatarPublicUrl(avatarPath);
    const src = cacheKey != null ? `${url}?v=${cacheKey}` : url;

    const img = (
      <img
        src={src}
        alt={displayName ? `Profilbild von ${displayName}` : "Profilbild"}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          display: "block",
        }}
      />
    );

    if (onClick) {
      return (
        <button
          type="button"
          onClick={onClick}
          aria-label="Profilbild ändern"
          className={className}
          style={{
            ...baseStyle,
            padding: 0,
            background: M.card,
            cursor: "pointer",
          }}
        >
          {img}
        </button>
      );
    }

    return (
      <div className={className} style={{ ...baseStyle, background: M.card }}>
        {img}
      </div>
    );
  }

  const initialContent = (
    <span
      style={{
        fontFamily: M.disp,
        fontWeight: 700,
        color: M.acc,
        fontSize,
        lineHeight: 1,
      }}
    >
      {initial}
    </span>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-label="Profilbild hinzufügen"
        className={className}
        style={{
          ...baseStyle,
          background: M.accSoft,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 0,
          cursor: "pointer",
        }}
      >
        {initialContent}
      </button>
    );
  }

  return (
    <div
      className={className}
      style={{
        ...baseStyle,
        background: M.accSoft,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {initialContent}
    </div>
  );
}
