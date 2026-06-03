import { Icon } from "./Icon";
import { M } from "../theme";

/** Dezentes Schloss für nicht löschbare Standard-Einträge in Workout-/Übungslisten. */
export function CatalogStandardLock() {
  return (
    <span title="Standard — nicht löschbar" style={{ display: "inline-flex", flexShrink: 0, lineHeight: 0 }}>
      <Icon name="lock" size={13} stroke={2} color={M.mut2} style={{ opacity: 0.72 }} />
    </span>
  );
}
