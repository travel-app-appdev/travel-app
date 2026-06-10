import { Router, Request, Response } from "express";

const router = Router();

router.get("/destinations", async (req: Request, res: Response) => {
    const query = (req.query.q as string ?? "").trim();
    if (!query || query.length < 1) {
        return res.json({ results: [] });
    }

    const apiKey = process.env.GEOAPIFY_API_KEY;
    if (!apiKey) return res.status(500).json({ error: "API key not configured" });

    try {
        const url =
            "https://api.geoapify.com/v1/geocode/autocomplete?text=" +
            encodeURIComponent(query) +
            "&type=city,country&limit=5&format=json&apiKey=" +
            apiKey;

        const response = await fetch(url);
        if (!response.ok) return res.json({ results: [] });

        const data = await response.json() as any;
        const results: string[] = [];

        for (const result of data.results ?? []) {
            const city = result.city ?? result.county ?? result.state;
            const country = result.country;
            const label = city && country
                ? `${city}, ${country}`
                : city ?? country;
            if (!label) continue;
            if (!results.includes(label)) results.push(label);
        }

        return res.json({ results });
    } catch {
        return res.json({ results: [] });
    }
});

export default router;
