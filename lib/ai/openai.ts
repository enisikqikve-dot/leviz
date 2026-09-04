import type { AiProvider, SearchIntentResult } from './index';

/**
 * Die Parameter fehlen absichtlich: beide Methoden brechen ab, und TypeScript
 * erlaubt einer Umsetzung weniger Parameter als die Schnittstelle vorsieht.
 */
const NOT_CONNECTED =
  'Kein Sprachmodell angebunden. AI_DRIVER=local setzen oder den Anbieter in lib/ai/openai.ts ergänzen.';

/**
 * Platzhalter für einen Sprachmodell-Anbieter.
 *
 * Anzubinden sind hier nur die beiden Aufrufe. Wichtig beim Einbau: Die
 * Beschreibung darf ausschließlich die übergebenen Felder verwenden. Ein
 * Sprachmodell ergänzt sonst bereitwillig Ausstattung oder Zustand, die im
 * Inserat nirgends steht — auf einem Fahrzeugmarktplatz wäre das eine
 * Falschangabe gegenüber dem Käufer, für die der Verkäufer haftet.
 */
export class OpenAiProvider implements AiProvider {
  readonly name = 'openai';

  async describe(): Promise<string> {
    throw new Error(NOT_CONNECTED);
  }

  async interpretSearch(): Promise<SearchIntentResult> {
    throw new Error(NOT_CONNECTED);
  }
}
