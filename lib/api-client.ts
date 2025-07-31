import type { KandelDeployment } from "@/types/kandel";

export class ApiError extends Error {
  constructor(message: string, public status: number) {
    super(message);
    this.name = "ApiError";
  }
}

const BASE_URL = "/api";

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options?.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new ApiError(
        error.message || `Request failed: ${response.statusText}`,
        response.status
      );
    }

    return response.json();
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError("Network error", 0);
  }
}

export async function getKandels(
  userAddress?: string
): Promise<{ kandels: KandelDeployment[] }> {
  const params = userAddress ? `?user=${userAddress}` : "";
  return request(`${BASE_URL}/kandels${params}`);
}

export async function createKandel(
  deployment: KandelDeployment
): Promise<void> {
  return request(`${BASE_URL}/kandels`, {
    method: "POST",
    body: JSON.stringify(deployment),
  });
}

export async function removeKandel(address: string): Promise<void> {
  return request(`${BASE_URL}/kandels`, {
    method: "DELETE",
    body: JSON.stringify({ address }),
  });
}
