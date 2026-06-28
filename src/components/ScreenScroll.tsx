import type { CSSProperties, ReactNode } from "react";
import { CONTENT_HORIZONTAL_PADDING, SCROLL_BOTTOM_PADDING, screenHeaderPadding } from "../lib/responsive";
import { M } from "../theme";
import { Icon } from "./Icon";
import { MButton } from "./MButton";
import { floatNavContentInset } from "./FloatNav";

export const SCREEN_TITLE_STYLE: CSSProperties = {
  fontSize: 13,
  letterSpacing: 1.5,
  color: M.mut,
  fontWeight: 700,
};

export const SCREEN_BACK_HEADER_TRAILING_WIDTH = 24;

export type ScreenScrollBottom = "nav" | "default";

export function screenScrollPadding(bottom: ScreenScrollBottom = "nav"): string {
  const bottomPad = bottom === "nav" ? floatNavContentInset("bottom") : `${SCROLL_BOTTOM_PADDING}px`;
  return `0 ${CONTENT_HORIZONTAL_PADDING}px ${bottomPad}`;
}

export function screenPageScrollPadding(bottom: ScreenScrollBottom = "nav"): string {
  const bottomPad = bottom === "nav" ? floatNavContentInset("bottom") : `${SCROLL_BOTTOM_PADDING}px`;
  return `4px ${CONTENT_HORIZONTAL_PADDING}px ${bottomPad}`;
}

export function screenFooterPadding(): string {
  return `10px ${CONTENT_HORIZONTAL_PADDING}px 0`;
}

export interface ScreenScrollProps {
  children: ReactNode;
  bottom?: ScreenScrollBottom;
  style?: CSSProperties;
  /** Include 4px top padding (full-page scroll areas like Home). */
  page?: boolean;
}

export function ScreenScroll({ children, bottom = "nav", style, page }: ScreenScrollProps) {
  return (
    <div
      style={{
        flex: 1,
        minHeight: 0,
        overflowY: "auto",
        padding: page ? screenPageScrollPadding(bottom) : screenScrollPadding(bottom),
        position: "relative",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export interface ScreenHeaderProps {
  children: ReactNode;
  style?: CSSProperties;
}

export function ScreenHeader({ children, style }: ScreenHeaderProps) {
  return (
    <div
      style={{
        padding: screenHeaderPadding(),
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexShrink: 0,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export interface ScreenBackHeaderProps {
  onBack?: () => void;
  title: string;
  trailing?: ReactNode;
  backHidden?: boolean;
  backAriaLabel?: string;
  style?: CSSProperties;
}

export function ScreenBackHeader({
  onBack,
  title,
  trailing,
  backHidden = false,
  backAriaLabel = "Zurück",
  style,
}: ScreenBackHeaderProps) {
  const hideBack = backHidden || !onBack;

  return (
    <ScreenHeader style={style}>
      {hideBack ? (
        <span style={{ width: 40, flexShrink: 0 }} aria-hidden />
      ) : (
        <MButton onClick={onBack} variant="ghost" size="icon" aria-label={backAriaLabel}>
          <Icon name="chevL" size={20} stroke={2.2} color={M.mut} />
        </MButton>
      )}
      <span style={SCREEN_TITLE_STYLE}>{title}</span>
      {trailing ?? <span style={{ width: SCREEN_BACK_HEADER_TRAILING_WIDTH, flexShrink: 0 }} aria-hidden />}
    </ScreenHeader>
  );
}
