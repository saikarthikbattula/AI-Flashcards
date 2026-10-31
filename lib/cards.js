import { z } from "zod";
export const cardSchema = z.object({
  front: z.string().trim().min(1).max(500),
  back: z.string().trim().min(1).max(2000),
});
export const deckSchema = z.object({
  id: z.string().uuid(),
  title: z.string().trim().min(1).max(120),
  cards: z.array(cardSchema).min(1).max(30),
  createdAt: z.string().datetime(),
});
export const sampleCards = [
  {
    front: "What is retrieval-augmented generation?",
    back: "A technique that retrieves relevant documents and supplies them as context to a language model before generating an answer.",
  },
  {
    front: "Why should API keys stay on the server?",
    back: "Browser code is visible to visitors. Server-side secrets protect credentials and let you enforce authentication and usage limits.",
  },
  {
    front: "What does a database transaction guarantee?",
    back: "A group of reads and writes either succeeds together or leaves the database unchanged, preventing partial updates.",
  },
];
export function review(progress, id, known) {
  const old = progress[id] || { streak: 0, due: 0 };
  const streak = known ? old.streak + 1 : 0;
  return {
    ...progress,
    [id]: {
      streak,
      due:
        Date.now() + (known ? Math.min(30, 2 ** (streak - 1)) : 0) * 86400000,
    },
  };
}
