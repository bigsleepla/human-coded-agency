import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

// They Said So Quotes API — https://quotes.rest/
// Free endpoint: /qod (Quote of the Day). Categories like "inspire" are the
// closest free match for themes around human intelligence and creativity.
const BASE_URL = "https://quotes.rest";

export type Quote = {
  quote: string;
  author: string;
  category?: string;
  permalink?: string;
};

export const getQuoteOfTheDay = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) =>
    z
      .object({
        category: z.string().min(1).max(50).optional(),
      })
      .parse(input ?? {}),
  )
  .handler(async ({ data }): Promise<Quote> => {
    const url = new URL("/qod", BASE_URL);
    if (data.category) url.searchParams.set("category", data.category);

    const res = await fetch(url.toString(), {
      headers: { Accept: "application/json" },
    });

    if (!res.ok) {
      throw new Error(`quotes.rest request failed: ${res.status}`);
    }

    const json = (await res.json()) as {
      contents?: { quotes?: Array<Record<string, string>> };
    };
    const q = json.contents?.quotes?.[0];
    if (!q) throw new Error("quotes.rest returned no quote");

    return {
      quote: q.quote ?? "",
      author: q.author ?? "Unknown",
      category: q.category,
      permalink: q.permalink,
    };
  });
