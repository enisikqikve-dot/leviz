'use server';

import { revalidatePath } from 'next/cache';

import type { ActionResult } from '@/lib/action-result';
import { requireUser } from '@/lib/auth/guards';

import {
  markConversationRead, sendMessage, startConversation, toggleConversationBlock,
} from './core';

/**
 * Die Server Actions der Nachrichten. Wer schreibt, kommt aus dem Cookie;
 * die Arbeit macht `core.ts` -- dieselbe, die auch die API der App aufruft.
 */

/** Startet ein Gespräch zum Fahrzeug oder öffnet das bestehende. */
export async function startConversationAction(
  input: unknown,
): Promise<ActionResult<{ conversationId: string }>> {
  const user = await requireUser();
  const result = await startConversation(user.id, input);
  if (result.ok) revalidatePath('/messages');
  return result;
}

/** Antwort in einem bestehenden Gespräch. */
export async function sendMessageAction(input: unknown): Promise<ActionResult> {
  const user = await requireUser();
  const result = await sendMessage(user.id, input);
  if (result.ok) {
    revalidatePath(`/messages/${result.data.conversationId}`);
    revalidatePath('/messages');
    return { ok: true, data: undefined };
  }
  return result;
}

/** Markiert ein Gespräch als gelesen. */
export async function markConversationReadAction(id: string): Promise<ActionResult> {
  const user = await requireUser();
  return markConversationRead(user.id, id);
}

/** Blockiert ein Gespräch oder gibt es wieder frei. */
export async function toggleConversationBlockAction(
  id: string,
): Promise<ActionResult<{ blocked: boolean }>> {
  const user = await requireUser();
  const result = await toggleConversationBlock(user.id, id);
  if (result.ok) revalidatePath(`/messages/${id}`);
  return result;
}
