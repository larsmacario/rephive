import { useEffect, useMemo, useState } from "react";
import { M } from "../theme";

export interface BirthDateFieldProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
}

const MONTHS: { value: string; label: string }[] = [
  { value: "01", label: "Jan" },
  { value: "02", label: "Feb" },
  { value: "03", label: "Mär" },
  { value: "04", label: "Apr" },
  { value: "05", label: "Mai" },
  { value: "06", label: "Jun" },
  { value: "07", label: "Jul" },
  { value: "08", label: "Aug" },
  { value: "09", label: "Sep" },
  { value: "10", label: "Okt" },
  { value: "11", label: "Nov" },
  { value: "12", label: "Dez" },
];

function parseIsoDate(iso: string): { day: string; month: string; year: string } {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
    return { day: "", month: "", year: "" };
  }
  const [year, month, day] = iso.split("-");
  return { day, month, year };
}

function toIsoDate(day: string, month: string, year: string): string {
  if (!day || !month || !year) return "";
  return `${year}-${month}-${day}`;
}

function daysInMonth(month: string, year: string): number {
  if (!month) return 31;
  const y = parseInt(year, 10) || 2000;
  const m = parseInt(month, 10);
  return new Date(y, m, 0).getDate();
}

function clampDay(day: string, month: string, year: string): string {
  if (!day || !month) return day;
  const max = daysInMonth(month, year);
  const n = parseInt(day, 10);
  if (n <= max) return day;
  return String(max).padStart(2, "0");
}

const selectStyle: React.CSSProperties = {
  width: "100%",
  height: 48,
  padding: "0 28px 0 12px",
  borderRadius: 12,
  border: "1px solid " + M.line,
  backgroundColor: M.card,
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23888' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`,
  backgroundRepeat: "no-repeat",
  backgroundPosition: "right 10px center",
  backgroundSize: "12px",
  color: M.fg,
  fontFamily: M.body,
  fontSize: 16,
  fontWeight: 600,
  outline: "none",
  boxSizing: "border-box",
  textAlign: "center",
  cursor: "pointer",
  WebkitAppearance: "none",
  appearance: "none",
};

const placeholderColor = M.mut;

export function BirthDateField({ value, onChange, label = "Geburtsdatum (optional)" }: BirthDateFieldProps) {
  const parsed = parseIsoDate(value);
  const [day, setDay] = useState(parsed.day);
  const [month, setMonth] = useState(parsed.month);
  const [year, setYear] = useState(parsed.year);

  useEffect(() => {
    const next = parseIsoDate(value);
    setDay(next.day);
    setMonth(next.month);
    setYear(next.year);
  }, [value]);

  const years = useMemo(() => {
    const current = new Date().getFullYear();
    const list: string[] = [];
    for (let y = current; y >= current - 100; y--) {
      list.push(String(y));
    }
    return list;
  }, []);

  const dayOptions = useMemo(() => {
    const max = daysInMonth(month, year);
    return Array.from({ length: max }, (_, i) => String(i + 1).padStart(2, "0"));
  }, [month, year]);

  const emit = (d: string, m: string, y: string) => {
    const clampedDay = clampDay(d, m, y);
    setDay(clampedDay);
    setMonth(m);
    setYear(y);
    onChange(toIsoDate(clampedDay, m, y));
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, width: "100%", minWidth: 0 }}>
      <label style={{ fontSize: 13, color: M.mut, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>
        {label}
      </label>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.15fr 1.15fr", gap: 8, width: "100%" }}>
        <select
          aria-label="Tag"
          value={day}
          onChange={(e) => emit(e.target.value, month, year)}
          style={{ ...selectStyle, color: day ? M.fg : placeholderColor }}
        >
          <option value="">Tag</option>
          {dayOptions.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>

        <select
          aria-label="Monat"
          value={month}
          onChange={(e) => emit(day, e.target.value, year)}
          style={{ ...selectStyle, color: month ? M.fg : placeholderColor }}
        >
          <option value="">Monat</option>
          {MONTHS.map((m) => (
            <option key={m.value} value={m.value}>
              {m.label}
            </option>
          ))}
        </select>

        <select
          aria-label="Jahr"
          value={year}
          onChange={(e) => emit(day, month, e.target.value)}
          style={{ ...selectStyle, color: year ? M.fg : placeholderColor }}
        >
          <option value="">Jahr</option>
          {years.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
