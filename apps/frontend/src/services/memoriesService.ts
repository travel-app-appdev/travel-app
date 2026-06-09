const API_URL = process.env.EXPO_PUBLIC_API_URL;

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

async function readApiJson<T>(response: Response): Promise<T | ApiErrorResponse> {
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

export function getMemoryPhotoUrl(memory: MemoryPhoto, idToken: string): string {
  const separator = memory.file_url.includes("?") ? "&" : "?";
  return `${API_URL}${memory.file_url}${separator}idToken=${encodeURIComponent(
    idToken
  )}`;
}

export async function fetchMemories(payload: {
  tripId: string;
  idToken: string;
}): Promise<MemoryPhoto[]> {
  const response = await fetch(`${API_URL}/trips/${payload.tripId}/memories`, {
    headers: authHeaders(payload.idToken),
  });

  const data = await readApiJson<MemoryPhoto[]>(response);

  if (!response.ok) {
    throw new Error((data as ApiErrorResponse).error || "Could not load memories");
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
  const formData = new FormData();
  formData.append("photo", {
    uri: payload.uri,
    name: payload.name,
    type: payload.type,
  } as unknown as Blob);

  const response = await fetch(`${API_URL}/trips/${payload.tripId}/memories`, {
    method: "POST",
    headers: authHeaders(payload.idToken),
    body: formData,
  });

  const data = await readApiJson<MemoryPhoto>(response);

  if (!response.ok) {
    throw new Error((data as ApiErrorResponse).error || "Could not upload memory");
  }

  return data as MemoryPhoto;
}
