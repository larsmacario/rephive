/** Post-process gym voice transcripts — fix common DE speech-to-text confusions. */
export function cleanVoiceTranscript(raw: string): string {
  let s = raw.trim();

  // „10 €“ / „Zehn €“ — oft „Kilo“ statt Währung.
  s = s.replace(/(\d+(?:[.,]\d+)?)\s*€/g, "$1 Kilo");
  s = s.replace(/\s€\s/g, " Kilo ");
  s = s.replace(/€/g, " ");

  const wordFixes: [RegExp, string][] = [
    [/\bkino\b/gi, "Kilo"],
    [/\beuro?s?\b/gi, "Kilo"],
    [/\bkilogramm\b/gi, "Kilo"],
    [/\bk\s*g\b/gi, "kg"],
    [/\bka\s*ge?\b/gi, "kg"],
    [/\bwieder\s+holung(en)?\b/gi, "Wiederholung$1"],
    [/\bwiderholung(en)?\b/gi, "Wiederholung$1"],
    [/\bwd\s*h\.?\b/gi, "Wdh"],
    [/\bwh\.?\b/gi, "Wdh"],
    [/\brepetition(en)?\b/gi, "Wiederholung$1"],
    [/\brep(s)?\b/gi, "Wdh"],
    [/\bx\b/gi, "mal"],
  ];

  for (const [pattern, replacement] of wordFixes) {
    s = s.replace(pattern, replacement);
  }

  return s.replace(/\s+/g, " ").trim();
}
