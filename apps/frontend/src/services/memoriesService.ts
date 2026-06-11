import { Platform } from "react-native";
import { File, Paths } from "expo-file-system";
import * as FileSystem from "expo-file-system/legacy";
import * as MediaLibrary from "expo-media-library";

const API_URL = process.env.EXPO_PUBLIC_API_URL;
const MAX_UPLOAD_BYTES = 900 * 1024;

export type MemoryPhoto = {
  memory_id: string;
  trip_id: string;
  uploaded_by: string;
  uploaded_by_name?: string;
  original_name: string;
  file_name: string;
  mime_type: string;
  file_size: number;
  created_at: string;
  file_url: string;
};

type ApiErrorResponse = {
  error?: string;
};

async function readApiJson<T>(
  response: Response
): Promise<T | ApiErrorResponse> {
  try {
    return (await response.json()) as T | ApiErrorResponse;
  } catch {
    return {};
  }
}

function authHeaders(idToken: string) {
  return {
    Authorization: `Bearer ${idToken}`,
  };
}

async function appendPhotoToFormData(
  formData: FormData,
  payload: { uri: string; name: string; type: string }
) {
  if (Platform.OS === "web") {
    const photoResponse = await fetch(payload.uri);
    const blob = await photoResponse.blob();
    const typedBlob =
      blob.type === payload.type
        ? blob
        : new Blob([blob], { type: payload.type || blob.type || "image/jpeg" });

    formData.append("photo", typedBlob, payload.name);
    return;
  }

  formData.append("photo", {
    uri: normalizeUploadUri(payload.uri),
    name: payload.name,
    type: payload.type,
  } as unknown as Blob);
}

function normalizeUploadUri(uri: string): string {
  if (uri.startsWith("file://") || uri.startsWith("content://")) {
    return uri;
  }

  return `file://${uri}`;
}

function assertApiUrl(): string {
  if (!API_URL) {
    throw new Error(
      "API URL is not configured. Set EXPO_PUBLIC_API_URL for this build."
    );
  }

  return API_URL;
}

function parseUploadResponseBody(body: string): MemoryPhoto | ApiErrorResponse {
  if (!body) {
    return {};
  }

  try {
    return JSON.parse(body) as MemoryPhoto | ApiErrorResponse;
  } catch {
    return {};
  }
}

async function uploadMemoryPhotoOnNative(payload: {
  tripId: string;
  idToken: string;
  uri: string;
  name: string;
  type: string;
}): Promise<MemoryPhoto> {
  const apiUrl = assertApiUrl();
  const fileUri = normalizeUploadUri(payload.uri);
  const fileInfo = await FileSystem.getInfoAsync(fileUri);

  if (!fileInfo.exists) {
    throw new Error("Could not read the selected photo.");
  }

  if (fileInfo.size && fileInfo.size > MAX_UPLOAD_BYTES) {
    throw new Error("Photo must be 1 MB or smaller.");
  }

  const uploadResult = await FileSystem.uploadAsync(
    `${apiUrl}/trips/${payload.tripId}/memories`,
    fileUri,
    {
      httpMethod: "POST",
      uploadType: FileSystem.FileSystemUploadType.MULTIPART,
      fieldName: "photo",
      mimeType: payload.type,
      headers: authHeaders(payload.idToken),
    }
  );

  const data = parseUploadResponseBody(uploadResult.body);

  if (uploadResult.status < 200 || uploadResult.status >= 300) {
    throw new Error(
      (data as ApiErrorResponse).error || "Could not upload memory"
    );
  }

  return data as MemoryPhoto;
}

async function uploadMemoryPhotoOnWeb(payload: {
  tripId: string;
  idToken: string;
  uri: string;
  name: string;
  type: string;
}): Promise<MemoryPhoto> {
  const apiUrl = assertApiUrl();
  const formData = new FormData();
  await appendPhotoToFormData(formData, payload);

  let response: Response;

  try {
    response = await fetch(`${apiUrl}/trips/${payload.tripId}/memories`, {
      method: "POST",
      headers: authHeaders(payload.idToken),
      body: formData,
    });
  } catch (error) {
    throw new Error(
      error instanceof Error
        ? error.message
        : "Network request failed while uploading photo"
    );
  }

  const data = await readApiJson<MemoryPhoto>(response);

  if (!response.ok) {
    throw new Error(
      (data as ApiErrorResponse).error || "Could not upload memory"
    );
  }

  return data as MemoryPhoto;
}

export function getMemoryPhotoUrl(
  memory: MemoryPhoto,
  idToken: string
): string {
  const apiUrl = assertApiUrl();
  const separator = memory.file_url.includes("?") ? "&" : "?";
  return `${apiUrl}${memory.file_url}${separator}idToken=${encodeURIComponent(
    idToken
  )}`;
}

export async function fetchMemories(payload: {
  tripId: string;
  idToken: string;
}): Promise<MemoryPhoto[]> {
  const apiUrl = assertApiUrl();
  const response = await fetch(`${apiUrl}/trips/${payload.tripId}/memories`, {
    headers: authHeaders(payload.idToken),
  });

  const data = await readApiJson<MemoryPhoto[]>(response);

  if (!response.ok) {
    throw new Error(
      (data as ApiErrorResponse).error || "Could not load memories"
    );
  }

  return data as MemoryPhoto[];
}

export async function uploadMemoryPhoto(payload: {
  tripId: string;
  idToken: string;
  uri: string;
  name: string;
  type: string;
}): Promise<MemoryPhoto> {
  if (Platform.OS === "web") {
    return uploadMemoryPhotoOnWeb(payload);
  }

  return uploadMemoryPhotoOnNative(payload);
}

export async function deleteMemoryPhoto(payload: {
  tripId: string;
  memoryId: string;
  idToken: string;
}): Promise<void> {
  const apiUrl = assertApiUrl();
  const response = await fetch(
    `${apiUrl}/trips/${payload.tripId}/memories/${payload.memoryId}`,
    {
      method: "DELETE",
      headers: authHeaders(payload.idToken),
    }
  );

  if (response.status === 204) return;

  const data = await readApiJson<never>(response);

  if (!response.ok) {
    throw new Error(
      (data as ApiErrorResponse).error || "Could not delete memory"
    );
  }
}

function getMemoryDownloadFilename(memory: MemoryPhoto): string {
  const rawName =
    memory.original_name || memory.file_name || `memory-${memory.memory_id}.jpg`;

  return rawName.trim() || `memory-${memory.memory_id}.jpg`;
}

async function downloadMemoryOnWeb(url: string, filename: string) {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error("Could not download image");
  }

  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = objectUrl;
  link.download = filename;
  link.rel = "noopener";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(objectUrl);
}

async function downloadMemoryOnNative(url: string, filename: string) {
  const permission = await MediaLibrary.requestPermissionsAsync(true);

  if (!permission.granted) {
    throw new Error("Please allow photo library access to save images.");
  }

  const destination = new File(Paths.cache, filename);
  await File.downloadFileAsync(url, destination, { idempotent: true });
  await MediaLibrary.saveToLibraryAsync(destination.uri);
}

export async function downloadMemoryPhoto(payload: {
  memory: MemoryPhoto;
  idToken: string;
}): Promise<void> {
  const url = getMemoryPhotoUrl(payload.memory, payload.idToken);
  const filename = getMemoryDownloadFilename(payload.memory);

  if (Platform.OS === "web") {
    await downloadMemoryOnWeb(url, filename);
    return;
  }

  await downloadMemoryOnNative(url, filename);
}

export async function downloadMemoryPhotos(payload: {
  memories: MemoryPhoto[];
  idToken: string;
}): Promise<void> {
  for (let index = 0; index < payload.memories.length; index += 1) {
    await downloadMemoryPhoto({
      memory: payload.memories[index],
      idToken: payload.idToken,
    });

    if (Platform.OS === "web" && index < payload.memories.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, 300));
    }
  }
}
