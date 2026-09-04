export type ComparisonCell = string | null;

export type ComparisonRow = {
  key: string;
  label: string;
  values: ComparisonCell[];
  /** Wahr, wenn sich mindestens zwei Fahrzeuge in dieser Zeile unterscheiden. */
  differs: boolean;
  /** Spaltenindizes mit dem besten Wert, etwa dem niedrigsten Preis. */
  best: number[];
};

export type RowInput = {
  key: string;
  label: string;
  values: ComparisonCell[];
  /**
   * Zahlenwerte zum Vergleichen. Ohne Angabe wird nur auf Gleichheit geprüft.
   */
  numbers?: (number | null)[];
  /** Ist der kleinere Wert der bessere? Etwa bei Preis und Kilometerstand. */
  lowerIsBetter?: boolean;
};

/**
 * Baut die Vergleichstabelle und markiert dabei zweierlei:
 * Zeilen, in denen sich die Fahrzeuge unterscheiden, und je Zeile den besten
 * Wert. Ohne diese Hervorhebung ist eine Tabelle mit vier Spalten und zwanzig
 * Zeilen kaum lesbar.
 */
export function buildComparisonRows(inputs: RowInput[]): ComparisonRow[] {
  return inputs.map((input) => {
    const present = input.values.filter((value) => value !== null);
    const differs = new Set(present).size > 1;

    let best: number[] = [];

    if (input.numbers && differs) {
      const numeric = input.numbers
        .map((value, index) => ({ value, index }))
        .filter((entry): entry is { value: number; index: number } => entry.value !== null);

      if (numeric.length > 1) {
        const target = input.lowerIsBetter
          ? Math.min(...numeric.map((entry) => entry.value))
          : Math.max(...numeric.map((entry) => entry.value));

        // Nur hervorheben, wenn nicht alle gleich gut sind.
        const winners = numeric.filter((entry) => entry.value === target);
        if (winners.length < numeric.length) best = winners.map((entry) => entry.index);
      }
    }

    return { key: input.key, label: input.label, values: input.values, differs, best };
  });
}

/** Filtert auf die Zeilen, in denen sich die Fahrzeuge unterscheiden. */
export function onlyDifferences(rows: ComparisonRow[]): ComparisonRow[] {
  return rows.filter((row) => row.differs);
}
