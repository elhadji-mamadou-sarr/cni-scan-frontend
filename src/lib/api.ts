/**
 * Client HTTP de l'API backend FastAPI (OCR CNI).
 *
 * - fetch natif, base URL depuis import.meta.env.VITE_API_URL.
 * - Toute erreur est normalisée en `ApiError { status, message }` avec un
 *   message en français adapté au code HTTP. `status = 0` = backend injoignable.
 */
import type {
  CniCreateIn,
  CniDetail,
  CniExtractionResponse,
  CniListResult,
  CniRectoOut,
  CniUpdateIn,
  HealthResponse,
  Stats,
} from "./types";

const BASE_URL = (import.meta.env.VITE_API_URL ?? "http://127.0.0.1:8000").replace(/\/$/, "");

/** Erreur d'API normalisée. `status = 0` signifie « serveur injoignable ». */
export class ApiError extends Error {
  readonly status: number;
  /** Erreurs par champ (422 de validation), clé = nom du champ (ex. "sexe"). */
  readonly fields?: Record<string, string>;

  constructor(status: number, message: string, fields?: Record<string, string>) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.fields = fields;
  }
}

/** Forme des corps d'erreur renvoyés par FastAPI ({ "detail": ... }). */
type FastApiErrorBody = {
  detail?: string | Array<{ msg?: string; loc?: (string | number)[] }>;
};

/** Extrait un message lisible du corps d'erreur FastAPI (string ou liste 422). */
function extractDetailMessage(body: unknown): string | null {
  if (!body || typeof body !== "object") return null;
  const detail = (body as FastApiErrorBody).detail;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail) && detail.length > 0) {
    return detail
      .map((item) => item?.msg)
      .filter((msg): msg is string => Boolean(msg))
      .join(" ; ");
  }
  return null;
}

/**
 * Extrait les erreurs par champ d'une réponse 422 FastAPI. Le `loc` est de la
 * forme ["body", "recto", "sexe"] : on retient le dernier segment comme champ.
 */
function extractFieldErrors(body: unknown): Record<string, string> | undefined {
  if (!body || typeof body !== "object") return undefined;
  const detail = (body as FastApiErrorBody).detail;
  if (!Array.isArray(detail)) return undefined;
  const fields: Record<string, string> = {};
  for (const item of detail) {
    const loc = item?.loc;
    const msg = item?.msg;
    if (Array.isArray(loc) && loc.length > 0 && typeof msg === "string") {
      const key = String(loc[loc.length - 1]);
      if (key !== "body") fields[key] = msg;
    }
  }
  return Object.keys(fields).length > 0 ? fields : undefined;
}

/** Construit un ApiError avec le message français adapté au statut HTTP. */
async function toApiError(response: Response): Promise<ApiError> {
  let body: unknown = null;
  try {
    body = await response.json();
  } catch {
    // Corps non-JSON ou vide : on se rabat sur le message par statut.
  }
  const backendMessage = extractDetailMessage(body);

  switch (response.status) {
    case 413:
      return new ApiError(413, "Fichier trop volumineux (max 10 Mo)");
    case 415:
      return new ApiError(415, "Format non supporté (JPEG ou PNG attendu)");
    case 422:
      return new ApiError(422, backendMessage ?? "Données invalides", extractFieldErrors(body));
    case 404:
      return new ApiError(404, backendMessage ?? "Ressource introuvable");
    default:
      return new ApiError(
        response.status,
        backendMessage ?? `Erreur serveur (${response.status})`,
      );
  }
}

/** Exécute une requête fetch et normalise erreurs réseau + HTTP en ApiError. */
async function request(path: string, init?: RequestInit): Promise<Response> {
  let response: Response;
  try {
    response = await fetch(`${BASE_URL}${path}`, init);
  } catch {
    // fetch ne rejette que sur erreur réseau (backend éteint, CORS, DNS...).
    throw new ApiError(0, "Impossible de joindre le serveur");
  }
  if (!response.ok) {
    throw await toApiError(response);
  }
  return response;
}

/** Parse une réponse JSON en la typant. */
async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await request(path, init);
  return (await response.json()) as T;
}

// --- Endpoints -----------------------------------------------------------

/** GET /health — état du backend (DB + Tesseract). */
export function health(): Promise<HealthResponse> {
  return requestJson<HealthResponse>("/health");
}

/** POST /extract — envoie recto + verso (multipart) et retourne l'extraction. */
export function postExtract(params: {
  recto: File;
  verso: File;
  persist?: boolean;
}): Promise<CniExtractionResponse> {
  const { recto, verso, persist = true } = params;
  const form = new FormData();
  form.append("recto", recto);
  form.append("verso", verso);
  return requestJson<CniExtractionResponse>(`/extract?persist=${persist}`, {
    method: "POST",
    body: form,
  });
}

/** GET /cni — liste paginée + recherche. Le total vient du header X-Total-Count. */
export async function listCni(params?: {
  offset?: number;
  limit?: number;
  search?: string;
}): Promise<CniListResult> {
  const { offset = 0, limit = 20, search } = params ?? {};
  const query = new URLSearchParams({
    offset: String(offset),
    limit: String(limit),
  });
  if (search && search.trim()) query.set("search", search.trim());

  const response = await request(`/cni?${query.toString()}`);
  const items = (await response.json()) as CniRectoOut[];
  const totalHeader = response.headers.get("X-Total-Count");
  const total = totalHeader != null ? Number(totalHeader) : items.length;
  return { items, total: Number.isNaN(total) ? items.length : total };
}

/** POST /cni — enregistre (upsert) une carte extraite après vérification. */
export function postCni(payload: CniCreateIn): Promise<CniDetail> {
  return requestJson<CniDetail>("/cni", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

/** GET /cni/{numero}/detail — fiche complète recto + verso. */
export function getCniDetail(numero: string): Promise<CniDetail> {
  return requestJson<CniDetail>(`/cni/${encodeURIComponent(numero)}/detail`);
}

/** PATCH /cni/{numero} — correction partielle, retourne la fiche mise à jour. */
export function patchCni(numero: string, updates: CniUpdateIn): Promise<CniDetail> {
  return requestJson<CniDetail>(`/cni/${encodeURIComponent(numero)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(updates),
  });
}

/** GET /stats — KPIs du dashboard. */
export function getStats(): Promise<Stats> {
  return requestJson<Stats>("/stats");
}
