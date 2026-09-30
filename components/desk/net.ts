/**
 * The one way a client component talks to /api/desk. It never throws, and
 * always answers in words a person can read: a network failure says nothing
 * was changed, and a refusal carries the server's own reason.
 */

export type CallResult<T> =
  | { ok: true; status: number; data: T }
  | { ok: false; status: number; error: string; data: unknown };

export async function call<T>(method: "GET" | "POST" | "PATCH" | "DELETE", url: string, body?: unknown): Promise<CallResult<T>> {
  try {
    const res = await fetch(url, {
      method,
      cache: "no-store",
      headers: {
        ...(body !== undefined ? { "content-type": "application/json" } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    let data: unknown = null;
    try {
      data = await res.json();
    } catch {
      // No body, or not JSON: the status is what there is to report.
    }
    if (!res.ok) {
      const said = data && typeof data === "object" && "error" in data ? String((data as { error: unknown }).error) : null;
      return { ok: false, status: res.status, error: said ?? `The server answered ${res.status}.`, data };
    }
    return { ok: true, status: res.status, data: data as T };
  } catch {
    return { ok: false, status: 0, error: "The server could not be reached. Nothing was changed.", data: null };
  }
}
