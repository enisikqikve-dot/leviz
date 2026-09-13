import { NextResponse } from 'next/server';
import { ZodError } from 'zod';

/**
 * Eine Antwortform fuer die ganze API.
 *
 * Erfolg: `{ data: ... }`. Fehler: `{ error: { code, message } }` mit dem
 * passenden HTTP-Status. Der `code` ist stabil und maschinenlesbar -- die App
 * entscheidet daran, was sie tut. Die `message` ist fuer Protokolle und
 * Entwickler, nicht fuer die Anzeige: uebersetzt wird in der App.
 */

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message?: string,
  ) {
    super(message ?? code);
  }
}

export const unauthorized = (code = 'unauthorized') => new ApiError(401, code);
export const forbidden = (code = 'forbidden') => new ApiError(403, code);
export const notFound = (code = 'not-found') => new ApiError(404, code);
export const badRequest = (code: string, message?: string) => new ApiError(400, code, message);
export const tooMany = () => new ApiError(429, 'too-many-requests');

export function ok<T>(data: T, init?: ResponseInit): NextResponse {
  return NextResponse.json({ data }, init);
}

export function noContent(): NextResponse {
  return new NextResponse(null, { status: 204 });
}

export function failure(status: number, code: string, message?: string): NextResponse {
  return NextResponse.json({ error: { code, message: message ?? code } }, { status });
}

/**
 * Huelle um jeden Handler.
 *
 * Erwartete Fehler werden zu ihrer Antwort; Zod-Fehler zu 400 mit den
 * Feldern; alles andere zu 500 -- protokolliert, aber ohne Stacktrace nach
 * aussen. Eine API, die bei einem Programmierfehler ihre Innereien zeigt,
 * hilft nur dem, der sie angreift.
 */
export function handle(
  fn: (request: Request, context: { params: Promise<Record<string, string>> }) => Promise<NextResponse>,
) {
  return async (
    request: Request,
    context: { params: Promise<Record<string, string>> },
  ): Promise<NextResponse> => {
    try {
      return await fn(request, context);
    } catch (fehler) {
      if (fehler instanceof ApiError) return failure(fehler.status, fehler.code, fehler.message);

      if (fehler instanceof ZodError) {
        return NextResponse.json(
          {
            error: {
              code: 'validation',
              message: 'validation',
              fields: fehler.issues.map((issue) => ({
                path: issue.path.map(String).join('.'),
                message: issue.message,
              })),
            },
          },
          { status: 400 },
        );
      }

      console.error('  LEVIZ API:', fehler);
      return failure(500, 'internal');
    }
  };
}

/** JSON-Rumpf lesen; ein fehlender oder kaputter Rumpf ist ein 400, kein 500. */
export async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw badRequest('invalid-json');
  }
}
