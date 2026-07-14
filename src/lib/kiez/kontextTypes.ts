// Shared Anwohner-Kontext types for the Kiez-Daten kiosk (Kanal 04, Task 9's
// Berlin-Vergleich + kontext-chip server lib). PURE — zero imports. Task 9
// implements the server-side lookup that produces `KiezKontext`; this task
// (K03/K04) only consumes the shape via `KzKanalSocial`'s `kontext` prop.

/** One forum-thread chip linked from a social indicator row. */
export interface KontextChip {
  id: string;
  title: string;
  href: string;
}

/** Per-indicator kontext chip lists for the selected planning area's Kanal 04 rows. */
export interface KiezKontext {
  alq: KontextChip[];
  kinderarmut: KontextChip[];
  transfer: KontextChip[];
}
