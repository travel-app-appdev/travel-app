import { Request, Response } from "express";
import {
    getMemoryPhotoFile,
    listMemoryPhotos,
    uploadMemoryPhoto,
} from "../services/memoriesService";

function getBearerToken(req: Request): string | undefined {
    const authorization = req.header("authorization") ?? "";
    const [scheme, token] = authorization.split(" ");

    if (scheme?.toLowerCase() === "bearer" && token) {
        return token;
    }

    return undefined;
}

function getRequestToken(req: Request): string | undefined {
    return (
        getBearerToken(req) ??
        req.body?.idToken ??
        (req.query.idToken as string | undefined)
    );
}

function sendError(res: Response, error: any, fallback: string): void {
    if (typeof error?.status === "number") {
        res.status(error.status).json({ error: error.message ?? fallback });
        return;
    }

    if (
        error?.code === "auth/argument-error" ||
        error?.code === "auth/invalid-id-token"
    ) {
        res.status(401).json({ error: "Invalid token" });
        return;
    }

    console.error(fallback, error);
    res.status(500).json({ error: fallback });
}

export async function getMemories(req: Request, res: Response): Promise<void> {
    const tripId = String(req.params.tripId);
    const idToken = getRequestToken(req);

    if (!idToken) {
        res.status(400).json({ error: "idToken is required" });
        return;
    }

    try {
        const memories = await listMemoryPhotos({ tripId, idToken });
        res.status(200).json(memories);
    } catch (error) {
        sendError(res, error, "Failed to load memories");
    }
}

export async function createMemory(req: Request, res: Response): Promise<void> {
    const tripId = String(req.params.tripId);
    const idToken = getRequestToken(req);

    if (!idToken) {
        res.status(400).json({ error: "idToken is required" });
        return;
    }

    try {
        const memory = await uploadMemoryPhoto({
            tripId,
            idToken,
            file: req.file,
        });
        res.status(201).json(memory);
    } catch (error) {
        sendError(res, error, "Failed to upload memory");
    }
}

export async function getMemoryFile(req: Request, res: Response): Promise<void> {
    const tripId = String(req.params.tripId);
    const memoryId = String(req.params.memoryId);
    const idToken = getRequestToken(req);

    if (!idToken) {
        res.status(400).json({ error: "idToken is required" });
        return;
    }

    try {
        const file = await getMemoryPhotoFile({ tripId, memoryId, idToken });
        res.setHeader("Content-Type", file.mimeType);
        res.setHeader(
            "Content-Disposition",
            `inline; filename="${encodeURIComponent(file.originalName)}"`
        );
        res.sendFile(file.filePath);
    } catch (error) {
        sendError(res, error, "Failed to load memory photo");
    }
}
