import { Router, Request, Response } from "express";

const router = Router();

type GeoapifyAutocompleteResult = {
  result_type?: string;
  city?: string;
  name?: string;
  county?: string;
  state?: string;
  country?: string;
  formatted?: string;
  address_line1?: string;
};

type GeoapifyAutocompleteResponse = {
  results?: GeoapifyAutocompleteResult[];
};

function getQuery(req: Request): string {
  const q = req.query.q;

  if (typeof q === "string") {
    return q.trim();
  }

  if (Array.isArray(q) && typeof q[0] === "string") {
    return q[0].trim();
  }

  return "";
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function buildLabel(result: GeoapifyAutocompleteResult): string | null {
  const country = text(result.country);

  if (result.result_type === "country" && country) {
    return country;
  }

  const city = text(result.city) || text(result.name);
  const state = text(result.state);
  const county = text(result.county);
  const formatted = text(result.formatted);
  const addressLine = text(result.address_line1);

  if (city && country) return `${city}, ${country}`;
  if (city && state) return `${city}, ${state}`;
  if (city) return city;

  if (county && country) return `${county}, ${country}`;
  if (state && country) return `${state}, ${country}`;

  return formatted || addressLine || country || null;
}

async function fetchGeoapifyAutocomplete(
  query: string,
  type: "city" | "country",
  apiKey: string
): Promise<GeoapifyAutocompleteResult[]> {
  const params = new URLSearchParams({
    text: query,
    type,
    limit: "5",
    format: "json",
    apiKey,
  });

  const url = `https://api.geoapify.com/v1/geocode/autocomplete?${params.toString()}`;

  const response = await fetch(url);

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    console.warn(
      `[autocomplete] Geoapify request failed for type=${type}:`,
      response.status,
      errorText
    );
    return [];
  }

  const data = (await response.json()) as GeoapifyAutocompleteResponse;

  return Array.isArray(data.results) ? data.results : [];
}

router.get("/destinations", async (req: Request, res: Response) => {
  const query = getQuery(req);

  if (query.length < 1) {
    return res.json({ results: [] });
  }

  const apiKey = process.env.GEOAPIFY_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: "API key not configured" });
  }

  try {
    const [cityResults, countryResults] = await Promise.all([
      fetchGeoapifyAutocomplete(query, "city", apiKey),
      fetchGeoapifyAutocomplete(query, "country", apiKey),
    ]);

    const labels: string[] = [];

    for (const result of [...cityResults, ...countryResults]) {
      const label = buildLabel(result);

      if (!label) continue;
      if (labels.includes(label)) continue;

      labels.push(label);

      if (labels.length >= 5) break;
    }

    return res.json({ results: labels });
  } catch (error) {
    console.warn("[autocomplete] failed:", error);
    return res.json({ results: [] });
  }
});

export default router;