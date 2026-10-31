import { z, readBody, guard, failure } from "../../../lib/http.js";
import { userId } from "../../../lib/auth.js";
import { db } from "../../../lib/admin.js";
import { deckSchema } from "../../../lib/cards.js";
export async function GET() {
  try {
    const uid = await userId();
    const snap = await db().collection(`users/${uid}/decks`).limit(100).get();
    return Response.json({
      decks: snap.docs
        .map((d) => d.data())
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    });
  } catch (e) {
    return failure(e);
  }
}
export async function POST(req) {
  try {
    guard(req);
    const uid = await userId();
    const deck = await readBody(req, deckSchema, 90000);
    await db().doc(`users/${uid}/decks/${deck.id}`).set(deck);
    return Response.json({ saved: true });
  } catch (e) {
    return failure(e);
  }
}
export async function DELETE(req) {
  try {
    guard(req);
    const uid = await userId();
    const { id } = await readBody(req, z.object({ id: z.string().uuid() }));
    await db().doc(`users/${uid}/decks/${id}`).delete();
    return Response.json({ deleted: true });
  } catch (e) {
    return failure(e);
  }
}
