import { Request, Response } from "express";
import admin from "../config/firebase";
import { getActivitySuggestions, saveMemberPreferences } from "../services/suggestionsService";
import { findMembership } from "../repositories/tripsRepository";

export async function getSuggestionsController(req: Request, res: Response) {
    try {
        const { tripId } = req.params;
        const slotType = (req.query.slotType as string) ?? "any";
        const idToken = req.headers.authorization?.replace("Bearer ", "");

        if (!idToken) return res.status(401).json({ error: "Unauthorized" });

        const decoded = await admin.auth().verifyIdToken(idToken as string);
        const membership = await findMembership(tripId as string, decoded.uid);
        if (!membership) return res.status(403).json({ error: "Not a member of this trip" });

        const suggestions = await getActivitySuggestions(tripId as string, slotType);
        return res.json({ suggestions });
    } catch (err: any) {
        return res.status(err.status ?? 500).json({ error: err.message ?? "Internal server error" });
    }
}

export async function updatePreferencesController(req: Request, res: Response) {
    try {
        const { tripId } = req.params;
        const { preferences } = req.body as { preferences: string[] };
        const idToken = req.headers.authorization?.replace("Bearer ", "");

        if (!idToken) return res.status(401).json({ error: "Unauthorized" });
        if (!Array.isArray(preferences)) return res.status(400).json({ error: "preferences must be an array" });

        const decoded = await admin.auth().verifyIdToken(idToken as string);
        const membership = await findMembership(tripId as string, decoded.uid);
        if (!membership) return res.status(403).json({ error: "Not a member of this trip" });

        const cleaned = preferences
            .filter((p) => typeof p === "string")
            .slice(0, 5);

        await saveMemberPreferences(tripId as string, decoded.uid, cleaned);
        return res.json({ preferences: cleaned });
    } catch (err: any) {
        return res.status(err.status ?? 500).json({ error: err.message ?? "Internal server error" });
    }
}
