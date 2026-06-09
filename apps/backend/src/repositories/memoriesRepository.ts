import admin from "../config/firebase";
import { MemoryPhoto, MemoryPhotoDocument } from "../types/trip";

const COLLECTION = "memory_photos";

function buildFileUrl(tripId: string, memoryId: string): string {
    return `/trips/${encodeURIComponent(tripId)}/memories/${encodeURIComponent(
        memoryId
    )}/file`;
}

function mapMemoryPhotoDoc(
    doc: FirebaseFirestore.QueryDocumentSnapshot<FirebaseFirestore.DocumentData>
): MemoryPhoto {
    const data = doc.data() as MemoryPhotoDocument;
    const createdAt = data.created_at;

    return {
        memory_id: doc.id,
        trip_id: data.trip_id,
        uploaded_by: data.uploaded_by,
        uploaded_by_name: data.uploaded_by_name,
        original_name: data.original_name,
        file_name: data.file_name,
        mime_type: data.mime_type,
        file_size: data.file_size,
        created_at:
            typeof createdAt?.toDate === "function"
                ? createdAt.toDate().toISOString()
                : typeof createdAt === "string"
                    ? createdAt
                    : new Date(0).toISOString(),
        file_url: buildFileUrl(data.trip_id, doc.id),
    };
}

export async function countMemoryPhotosByTripId(
    tripId: string
): Promise<number> {
    const snapshot = await admin
        .firestore()
        .collection(COLLECTION)
        .where("trip_id", "==", tripId)
        .count()
        .get();

    return snapshot.data().count;
}

export async function createMemoryPhoto(data: {
    tripId: string;
    uploadedBy: string;
    uploadedByName?: string;
    originalName: string;
    fileName: string;
    mimeType: string;
    fileSize: number;
}): Promise<MemoryPhoto> {
    const db = admin.firestore();
    const docRef = db.collection(COLLECTION).doc();
    const createdAt = admin.firestore.Timestamp.now();

    await docRef.set({
        trip_id: data.tripId,
        uploaded_by: data.uploadedBy,
        uploaded_by_name: data.uploadedByName,
        original_name: data.originalName,
        file_name: data.fileName,
        mime_type: data.mimeType,
        file_size: data.fileSize,
        created_at: createdAt,
    } satisfies MemoryPhotoDocument);

    return {
        memory_id: docRef.id,
        trip_id: data.tripId,
        uploaded_by: data.uploadedBy,
        uploaded_by_name: data.uploadedByName,
        original_name: data.originalName,
        file_name: data.fileName,
        mime_type: data.mimeType,
        file_size: data.fileSize,
        created_at: createdAt.toDate().toISOString(),
        file_url: buildFileUrl(data.tripId, docRef.id),
    };
}

export async function findMemoryPhotosByTripId(
    tripId: string
): Promise<MemoryPhoto[]> {
    const snapshot = await admin
        .firestore()
        .collection(COLLECTION)
        .where("trip_id", "==", tripId)
        .get();

    return snapshot.docs
        .map(mapMemoryPhotoDoc)
        .sort(
            (a, b) =>
                new Date(b.created_at).getTime() -
                new Date(a.created_at).getTime()
        );
}

export async function findMemoryPhotoById(
    memoryId: string
): Promise<MemoryPhoto | null> {
    const doc = await admin.firestore().collection(COLLECTION).doc(memoryId).get();

    if (!doc.exists) return null;

    return mapMemoryPhotoDoc(
        doc as FirebaseFirestore.QueryDocumentSnapshot<FirebaseFirestore.DocumentData>
    );
}
