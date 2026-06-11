import { createServerFn } from "@tanstack/react-start";

// Curated quotes on the uniqueness of human intelligence and creativity.
// The free quotes.rest /qod endpoint only returns a single generic daily
// quote and can't filter by theme without a paid They Said So API key, so
// we serve a topical set here and rotate by the current hour ("quote of the
// hour"). The server-function shape is preserved so callers don't change.
const QUOTES: Array<{ quote: string; author: string }> = [
  {
    quote:
      "Imagination is more important than knowledge. Knowledge is limited. Imagination encircles the world.",
    author: "Albert Einstein",
  },
  {
    quote:
      "The creative adult is the child who survived.",
    author: "Ursula K. Le Guin",
  },
  {
    quote:
      "Creativity is intelligence having fun.",
    author: "Albert Einstein",
  },
  {
    quote:
      "The human mind, once stretched by a new idea, never regains its original dimensions.",
    author: "Oliver Wendell Holmes",
  },
  {
    quote:
      "What makes us human is precisely the ability to imagine what is not.",
    author: "Yuval Noah Harari",
  },
  {
    quote:
      "The intuitive mind is a sacred gift and the rational mind is a faithful servant.",
    author: "Albert Einstein",
  },
  {
    quote:
      "To invent, you need a good imagination and a pile of junk.",
    author: "Thomas Edison",
  },
  {
    quote:
      "Every child is an artist. The problem is how to remain an artist once we grow up.",
    author: "Pablo Picasso",
  },
  {
    quote:
      "The mind is not a vessel to be filled, but a fire to be kindled.",
    author: "Plutarch",
  },
  {
    quote:
      "Human creativity is the one resource that grows when you spend it.",
    author: "Anonymous",
  },
  {
    quote:
      "Originality is nothing but judicious imitation made wholly our own.",
    author: "Voltaire",
  },
  {
    quote:
      "We are the storytelling animal — meaning is something only a human mind can make.",
    author: "Jonathan Gottschall",
  },
];

export type Quote = {
  quote: string;
  author: string;
};

export const getQuoteOfTheHour = createServerFn({ method: "GET" }).handler(
  async (): Promise<Quote> => {
    const hour = new Date().getUTCHours();
    return QUOTES[hour % QUOTES.length];
  },
);

// Backwards-compatible alias for existing callers.
export const getQuoteOfTheDay = getQuoteOfTheHour;
