// apps/backend/src/controllers/itineraryController.ts
import { Request, Response } from "express";
import { generateAndSaveItinerary, getItinerary } from "../services/itineraryService";

export const generateItineraryController = async (req: Request, res: Response): Promise<void> => {
    const tripId = String(req.params.tripId);

    try {
        const itinerary = await generateAndSaveItinerary(tripId);
        res.status(201).json(itinerary);
    } catch (error: any) {
        if (error.status === 404) {
            res.status(404).json({ error: error.message });
        } else if (error.status === 400) {
            res.status(400).json({ error: error.message });
        } else {
            res.status(500).json({ error: "Failed to generate itinerary" });
        }
    }
};

export const getItineraryController = async (req: Request, res: Response): Promise<void> => {
    const id = String(req.params.id);
    const state = req.query.state as string | undefined;

    try {
        const itinerary = await getItinerary(id, state);
        res.status(200).json(itinerary);
    } catch (error: any) {
        if (error.status === 404) {
            res.status(404).json({ error: error.message });
        } else if (error.status === 400) {
            res.status(400).json({ error: error.message });
        } else {
            res.status(500).json({ error: "Failed to get itinerary" });
        }
    }
};