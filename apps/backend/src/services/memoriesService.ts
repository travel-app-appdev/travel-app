import fs from "fs/promises";
import path from "path";
import admin from "../config/firebase";
import {
  countMemoryPhotosByTripId,
  createMemoryPhoto,
  deleteMemoryPhotoById,
  findMemoryPhotoById,
  findMemoryPhotosByTripId,
} from "../repositories/memoriesRepository";
import {
  findMembership,
  findTripById,
  findUserById,
} from "../repositories/tripsRepository";
import { MemoryPhoto } from "../types/trip";

export const MAX_MEMORY_PHOTO_BYTES = 1024 * 1024;
export const MAX_MEMORY_PHOTOS_PER_TRIP = 100;

const ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

function getUploadRoot() {
  return path.resolve(
    process.env.MEMORIES_UPLOAD_DIR ??
      path.join(process.cwd(), "uploads", "memories"),
  );
}

function getExtension(mimeType: string) {
  switch (mimeType) {
    case "image/png":
      return ".png";
    case "image/webp":
      return ".webp";
    case "image/jpeg":
    default:
      return ".jpg";
  }
}

async function verifyAcceptedMember(tripId: string, idToken: string) {
  const decoded = await admin.auth().verifyIdToken(idToken);
  const membership = await findMembership(tripId, decoded.uid);

  if (!membership || membership.invite_status !== "accepted") {
    throw { status: 404, message: "Trip not found" };
  }

  return decoded.uid;
}

async function ensureMemoriesTrip(tripId: string) {
  const trip = await findTripById(tripId);

  if (!trip) {
    throw { status: 404, message: "Trip not found" };
  }

  if (trip.state !== "Memories") {
    throw { status: 400, message: "Trip is not in Memories state" };
  }

  return trip;
}

export async function listMemoryPhotos(input: {
  tripId: string;
  idToken: string;
}): Promise<MemoryPhoto[]> {
  await verifyAcceptedMember(input.tripId, input.idToken);
  await ensureMemoriesTrip(input.tripId);

  return findMemoryPhotosByTripId(input.tripId);
}

export async function uploadMemoryPhoto(input: {
  tripId: string;
  idToken: string;
  file?: Express.Multer.File;
}): Promise<MemoryPhoto> {
  const userId = await verifyAcceptedMember(input.tripId, input.idToken);
  await ensureMemoriesTrip(input.tripId);

  const file = input.file;
  if (!file) {
    throw { status: 400, message: "photo is required" };
  }

  if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
    throw {
      status: 400,
      message: "Only JPEG, PNG, or WebP images are allowed",
    };
  }

  if (file.size > MAX_MEMORY_PHOTO_BYTES) {
    throw { status: 400, message: "Photo must be 1 MB or smaller" };
  }

  const currentCount = await countMemoryPhotosByTripId(input.tripId);
  if (currentCount >= MAX_MEMORY_PHOTOS_PER_TRIP) {
    throw {
      status: 400,
      message: "This trip already has the maximum number of memories",
    };
  }

  const user = await findUserById(userId);
  const memoryId = admin.firestore().collection("_").doc().id;
  const fileName = `${memoryId}${getExtension(file.mimetype)}`;
  const tripDir = path.join(getUploadRoot(), input.tripId);
  const filePath = path.join(tripDir, fileName);

  await fs.mkdir(tripDir, { recursive: true });
  await fs.writeFile(filePath, file.buffer);

  return createMemoryPhoto({
    tripId: input.tripId,
    uploadedBy: userId,
    uploadedByName: user?.name ?? undefined,
    originalName: file.originalname || fileName,
    fileName,
    mimeType: file.mimetype,
    fileSize: file.size,
  });
}

export async function getMemoryPhotoFile(input: {
  tripId: string;
  memoryId: string;
  idToken: string;
}): Promise<{ filePath: string; mimeType: string; originalName: string }> {
  await verifyAcceptedMember(input.tripId, input.idToken);
  await ensureMemoriesTrip(input.tripId);

  const memory = await findMemoryPhotoById(input.memoryId);
  if (!memory || memory.trip_id !== input.tripId) {
    throw { status: 404, message: "Memory photo not found" };
  }

  const filePath = path.join(getUploadRoot(), input.tripId, memory.file_name);

  try {
    await fs.access(filePath);
  } catch {
    throw { status: 404, message: "Memory photo file not found" };
  }

  return {
    filePath,
    mimeType: memory.mime_type,
    originalName: memory.original_name,
  };
}

export async function deleteMemoryPhoto(input: {
  tripId: string;
  memoryId: string;
  idToken: string;
}): Promise<void> {
  await verifyAcceptedMember(input.tripId, input.idToken);
  await ensureMemoriesTrip(input.tripId);

  const memory = await findMemoryPhotoById(input.memoryId);
  if (!memory || memory.trip_id !== input.tripId) {
    throw { status: 404, message: "Memory photo not found" };
  }

  await deleteMemoryPhotoById(input.memoryId);

  const filePath = path.join(getUploadRoot(), input.tripId, memory.file_name);
  try {
    await fs.rm(filePath, { force: true });
  } catch {
    // The database record is gone, so a missing stale file should not block deletion.
  }
}
