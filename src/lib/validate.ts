/**
 * Hand-written checks for JSON written by the on-device model. A small model
 * bends the format now and then, so the reader accepts harmless slips
 * ("7" for 7, "Medium" for "medium", 1,5 with a French comma) and collects
 * the real problems as short messages that can be sent back to the model.
 */

export type Validation<T> = { ok: true; value: T } | { ok: false; errors: string[] };

type JsonObject = Record<string, unknown>;

/** Lowercase, with spaces and hyphens as underscores: "Bright indirect" → "bright_indirect". */
function enumKey(value: string): string {
  return value.trim().toLowerCase().replace(/[\s-]+/g, '_');
}

function toNumber(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'string') {
    const match = value.trim().match(/^-?\d+(?:[.,]\d+)?/);
    return match ? Number(match[0].replace(',', '.')) : null;
  }
  return null;
}

/** Reads an untrusted value field by field. Invalid fields get a placeholder and an error. */
export class JsonReader {
  readonly errors: string[] = [];

  fail(path: string, expected: string, received?: unknown) {
    const got = received === undefined ? 'absent' : JSON.stringify(received)?.slice(0, 60);
    this.errors.push(`${path} : ${expected} (reçu : ${got})`);
  }

  object(value: unknown, path: string): JsonObject {
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) return value as JsonObject;
    this.fail(path, 'objet attendu', value);
    return {};
  }

  /** A non-empty string, trimmed and cut at `max` characters. */
  string(value: unknown, path: string, max = 200): string {
    if (typeof value === 'string' && value.trim()) return value.trim().replace(/\s+/g, ' ').slice(0, max);
    this.fail(path, 'texte non vide attendu', value);
    return '';
  }

  /** A whole number within bounds; decimals are rounded. */
  integer(value: unknown, path: string, min: number, max: number): number {
    const number = toNumber(value);
    const rounded = number === null ? null : Math.round(number);
    if (rounded !== null && rounded >= min && rounded <= max) return rounded;
    this.fail(path, `entier entre ${min} et ${max} attendu`, value);
    return min;
  }

  number(value: unknown, path: string, min: number, max: number): number {
    const number = toNumber(value);
    if (number !== null && number >= min && number <= max) return number;
    this.fail(path, `nombre entre ${min} et ${max} attendu`, value);
    return min;
  }

  boolean(value: unknown, path: string): boolean {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') {
      const key = enumKey(value);
      if (key === 'true' || key === 'oui' || key === 'yes') return true;
      if (key === 'false' || key === 'non' || key === 'no') return false;
    }
    this.fail(path, 'true ou false attendu', value);
    return false;
  }

  /** One of `values`, or a known synonym listed in `aliases`. */
  oneOf<T extends string>(
    value: unknown,
    path: string,
    values: readonly T[],
    aliases: Record<string, T> = {},
  ): T {
    if (typeof value === 'string') {
      const key = enumKey(value);
      const found = values.find((v) => v === key) ?? aliases[key];
      if (found) return found;
    }
    this.fail(path, `une valeur parmi ${values.join(', ')} attendue`, value);
    return values[0];
  }

  array(value: unknown, path: string): unknown[] {
    if (Array.isArray(value)) return value;
    this.fail(path, 'liste attendue', value);
    return [];
  }

  result<T>(value: T): Validation<T> {
    return this.errors.length === 0 ? { ok: true, value } : { ok: false, errors: this.errors };
  }
}
