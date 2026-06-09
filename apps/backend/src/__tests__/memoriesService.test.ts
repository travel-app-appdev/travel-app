const mockVerifyIdToken = jest.fn();

jest.mock("../config/firebase", () => ({
    __esModule: true,
    default: {
        auth: () => ({
            verifyIdToken: mockVerifyIdToken,
        }),
        firestore: () => ({
            collection: () => ({
                doc: () => ({ id: "generated-memory-id" }),
            }),
        }),
    },
}));

jest.mock("fs/promises", () => ({
    mkdir: jest.fn(),
    writeFile: jest.fn(),
    access: jest.fn(),
}));

jest.mock("../repositories/tripsRepository", () => ({
    findMembership: jest.fn(),
    findTripById: jest.fn(),
    findUserById: jest.fn(),
}));

jest.mock("../repositories/memoriesRepository", () => ({
    countMemoryPhotosByTripId: jest.fn(),
    createMemoryPhoto: jest.fn(),
    findMemoryPhotoById: jest.fn(),
    findMemoryPhotosByTripId: jest.fn(),
}));

import fs from "fs/promises";
import {
    countMemoryPhotosByTripId,
    createMemoryPhoto,
    findMemoryPhotosByTripId,
} from "../repositories/memoriesRepository";
import {
    findMembership,
    findTripById,
    findUserById,
} from "../repositories/tripsRepository";
import {
    MAX_MEMORY_PHOTO_BYTES,
    MAX_MEMORY_PHOTOS_PER_TRIP,
    listMemoryPhotos,
    uploadMemoryPhoto,
} from "../services/memoriesService";

const TRIP_ID = "trip-123";
const TOKEN = "token-123";
const USER_ID = "user-123";

function mockFile(overrides: Partial<Express.Multer.File> = {}): Express.Multer.File {
    return {
        fieldname: "photo",
        originalname: "beach.png",
        encoding: "7bit",
        mimetype: "image/png",
        size: 512,
        buffer: Buffer.from("photo"),
        destination: "",
        filename: "",
        path: "",
        stream: undefined as any,
        ...overrides,
    };
}

describe("memoriesService", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockVerifyIdToken.mockResolvedValue({ uid: USER_ID });
        (findMembership as jest.Mock).mockResolvedValue({
            user_id: USER_ID,
            trip_id: TRIP_ID,
            invite_status: "accepted",
            role: "member",
        });
        (findTripById as jest.Mock).mockResolvedValue({
            trip_id: TRIP_ID,
            title: "Greek Islands",
            destination: "Greece",
            start_date: "2026-08-14",
            end_date: "2026-08-22",
            state: "Memories",
        });
        (findUserById as jest.Mock).mockResolvedValue({ name: "Helen" });
        (countMemoryPhotosByTripId as jest.Mock).mockResolvedValue(0);
        (createMemoryPhoto as jest.Mock).mockResolvedValue({
            memory_id: "memory-123",
            trip_id: TRIP_ID,
        });
    });

    it("rejects listing memories for non-members", async () => {
        (findMembership as jest.Mock).mockResolvedValueOnce(null);

        await expect(
            listMemoryPhotos({ tripId: TRIP_ID, idToken: TOKEN })
        ).rejects.toMatchObject({
            status: 404,
            message: "Trip not found",
        });

        expect(findMemoryPhotosByTripId).not.toHaveBeenCalled();
    });

    it("rejects uploads for non-image files", async () => {
        await expect(
            uploadMemoryPhoto({
                tripId: TRIP_ID,
                idToken: TOKEN,
                file: mockFile({ mimetype: "text/plain" }),
            })
        ).rejects.toMatchObject({
            status: 400,
            message: "Only JPEG, PNG, or WebP images are allowed",
        });

        expect(fs.writeFile).not.toHaveBeenCalled();
        expect(createMemoryPhoto).not.toHaveBeenCalled();
    });

    it("rejects uploads larger than 1 MB", async () => {
        await expect(
            uploadMemoryPhoto({
                tripId: TRIP_ID,
                idToken: TOKEN,
                file: mockFile({ size: MAX_MEMORY_PHOTO_BYTES + 1 }),
            })
        ).rejects.toMatchObject({
            status: 400,
            message: "Photo must be 1 MB or smaller",
        });

        expect(fs.writeFile).not.toHaveBeenCalled();
        expect(createMemoryPhoto).not.toHaveBeenCalled();
    });

    it("rejects uploads after the trip photo limit", async () => {
        (countMemoryPhotosByTripId as jest.Mock).mockResolvedValueOnce(
            MAX_MEMORY_PHOTOS_PER_TRIP
        );

        await expect(
            uploadMemoryPhoto({
                tripId: TRIP_ID,
                idToken: TOKEN,
                file: mockFile(),
            })
        ).rejects.toMatchObject({
            status: 400,
            message: "This trip already has the maximum number of memories",
        });

        expect(fs.writeFile).not.toHaveBeenCalled();
        expect(createMemoryPhoto).not.toHaveBeenCalled();
    });

    it("writes the file and saves metadata for a valid member upload", async () => {
        await uploadMemoryPhoto({
            tripId: TRIP_ID,
            idToken: TOKEN,
            file: mockFile(),
        });

        expect(fs.mkdir).toHaveBeenCalled();
        expect(fs.writeFile).toHaveBeenCalledWith(
            expect.stringContaining("generated-memory-id.png"),
            Buffer.from("photo")
        );
        expect(createMemoryPhoto).toHaveBeenCalledWith(
            expect.objectContaining({
                tripId: TRIP_ID,
                uploadedBy: USER_ID,
                uploadedByName: "Helen",
                originalName: "beach.png",
                fileName: "generated-memory-id.png",
                mimeType: "image/png",
                fileSize: 512,
            })
        );
    });
});
