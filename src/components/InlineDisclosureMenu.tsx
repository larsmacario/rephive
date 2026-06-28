import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { M } from "../theme";
import { Icon } from "./Icon";

const MENU_WIDTH = 168;
const MENU_Z = 200;

export type InlineDisclosureMenuItem = {
  icon: ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
};

export interface InlineDisclosureMenuProps {
  menuItems: InlineDisclosureMenuItem[];
  showDelete?: boolean;
  deleteDisabled?: boolean;
  onDelete?: () => void;
  triggerSize?: number;
  triggerMarginLeft?: number;
  ariaLabel?: string;
}

function menuItemStyle(disabled: boolean, danger = false): CSSProperties {
  return {
    width: "100%",
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "10px 12px",
    background: "none",
    border: "none",
    borderRadius: 8,
    cursor: disabled ? "not-allowed" : "pointer",
    color: disabled ? M.mut2 : danger ? "#f5b4b4" : M.fg,
    fontSize: 14,
    fontWeight: 600,
    textAlign: "left",
    opacity: disabled ? 0.45 : 1,
    fontFamily: M.body,
  };
}

export function InlineDisclosureMenu({
  menuItems,
  showDelete = false,
  deleteDisabled = false,
  onDelete,
  triggerSize = 44,
  triggerMarginLeft = 0,
  ariaLabel = "Aktionen",
}: InlineDisclosureMenuProps) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const updatePosition = () => {
    const el = triggerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const left = Math.max(8, Math.min(rect.right - MENU_WIDTH, window.innerWidth - MENU_WIDTH - 8));
    setPos({ top: rect.bottom + 6, left });
  };

  useEffect(() => {
    if (!open) return;
    updatePosition();
    const onScroll = () => updatePosition();
    const onResize = () => updatePosition();
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onResize);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (triggerRef.current?.contains(target)) return;
      if (menuRef.current?.contains(target)) return;
      setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const closeAndRun = (action: () => void) => {
    setOpen(false);
    action();
  };

  const hasActions = menuItems.length > 0 || showDelete;

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => {
          if (!hasActions) return;
          setOpen((value) => {
            const next = !value;
            if (next) updatePosition();
            return next;
          });
        }}
        aria-label={ariaLabel}
        aria-haspopup="menu"
        aria-expanded={open}
        style={{
          width: triggerSize,
          height: triggerSize,
          marginLeft: triggerMarginLeft,
          borderRadius: triggerSize >= 44 ? 11 : 9,
          border: "1px solid " + M.line2,
          background: open ? M.cardHi : "transparent",
          color: M.mut2,
          cursor: hasActions ? "pointer" : "not-allowed",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <Icon name="moreH" size={triggerSize >= 44 ? 18 : 16} stroke={2.2} />
      </button>
      {open && pos && hasActions
        ? createPortal(
            <div
              ref={menuRef}
              role="menu"
              aria-label={ariaLabel}
              style={{
                position: "fixed",
                top: pos.top,
                left: pos.left,
                width: MENU_WIDTH,
                padding: 6,
                borderRadius: 12,
                border: "1px solid " + M.line2,
                background: M.cardHi,
                boxShadow: "0 12px 32px rgba(0,0,0,.45)",
                zIndex: MENU_Z,
              }}
            >
              {menuItems.map((item) => (
                <button
                  key={item.label}
                  type="button"
                  role="menuitem"
                  disabled={item.disabled}
                  onClick={() => {
                    if (item.disabled) return;
                    closeAndRun(item.onClick);
                  }}
                  style={menuItemStyle(Boolean(item.disabled))}
                >
                  {item.icon}
                  {item.label}
                </button>
              ))}
              {showDelete ? (
                <>
                  {menuItems.length > 0 ? (
                    <div
                      style={{
                        height: 1,
                        margin: "4px 8px",
                        background: M.line2,
                      }}
                    />
                  ) : null}
                  <button
                    type="button"
                    role="menuitem"
                    disabled={deleteDisabled}
                    onClick={() => {
                      if (deleteDisabled || !onDelete) return;
                      closeAndRun(onDelete);
                    }}
                    style={menuItemStyle(deleteDisabled, true)}
                  >
                    <Icon name="trash" size={16} stroke={2} color={deleteDisabled ? M.mut2 : "#f5b4b4"} />
                    Löschen
                  </button>
                </>
              ) : null}
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
