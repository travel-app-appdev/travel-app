import { Router, Request, Response } from "express";

const router = Router();

type GeoapifyResult = {
  result_type?: string;
  city?: string;
  name?: string;
  county?: string;
  state?: string;
  country?: string;
  formatted?: string;
  address_line1?: string;
};

type GeoapifyResponse = {
  results?: GeoapifyResult[];
};

function getQuery(req: Request): string {
  const q = req.query.q;

  if (typeof q === "string") return q.trim();
  if (Array.isArray(q) && typeof q[0] === "string") return q[0].trim();

  return "";
}

function clean(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function buildLabel(result: GeoapifyResult): string | null {
  const country = clean(result.country);
  const city = clean(result.city) || clean(result.name);
  const state = clean(result.state);
  const county = clean(result.county);
  const formatted = clean(result.formatted);
  const addressLine = clean(result.address_line1);

  if (result.result_type === "country" && country) {
    return country;
  }

  if (city && country) return `${city}, ${country}`;
  if (city && state) return `${city}, ${state}`;
  if (city) return city;

  if (county && country) return `${county}, ${country}`;
  if (state && country) return `${state}, ${country}`;
  if (country) return country;

  return formatted || addressLine || null;
}

async function fetchGeoapify(
  query: string,
  type: "city" | "country",
  apiKey: string
): Promise<GeoapifyResult[]> {
  const params = new URLSearchParams({
    text: query,
    type,
    limit: "5",
    lang: "en",
    format: "json",
    apiKey,
  });

  const url = `https://api.geoapify.com/v1/geocode/autocomplete?${params.toString()}`;

  const response = await fetch(url);

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    console.warn(
      `[autocomplete] Geoapify failed type=${type}:`,
      response.status,
      errorText
    );
    return [];
  }

  const data = (await response.json()) as GeoapifyResponse;

  return Array.isArray(data.results) ? data.results : [];
}

router.get("/destinations", async (req: Request, res: Response) => {
  const query = getQuery(req);

  if (query.length < 1) {
    return res.json({ results: [] });
  }

  const apiKey = process.env.GEOAPIFY_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: "GEOAPIFY_API_KEY is not configured" });
  }

  try {
    const [countries, cities] = await Promise.all([
      fetchGeoapify(query, "country", apiKey),
      fetchGeoapify(query, "city", apiKey),
    ]);

    const labels: string[] = [];

    for (const result of [...countries, ...cities]) {
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