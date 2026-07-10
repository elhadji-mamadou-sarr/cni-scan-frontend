/**
 * Petit store mémoire pour le flux d'extraction (upload → processing → verify).
 *
 * Les objets `File` sélectionnés à l'upload ne peuvent pas transiter par l'URL :
 * on les garde ici le temps de naviguer vers /processing, qui lance alors la
 * mutation d'extraction. Volontairement en mémoire : un rechargement complet de
 * page perd la sélection (processing redirige alors vers /upload), ce qui est le
 * comportement voulu (on ne ré-uploade pas des fichiers fantômes).
 */
import type { CniExtractionResponse } from "./types";

export interface PendingUpload {
  recto: File;
  verso: File;
  persist: boolean;
}

let pendingUpload: PendingUpload | null = null;

export function setPendingUpload(upload: PendingUpload | null): void {
  pendingUpload = upload;
}

export function getPendingUpload(): PendingUpload | null {
  return pendingUpload;
}

export function clearPendingUpload(): void {
  pendingUpload = null;
}

/**
 * Dernière réponse d'extraction, transmise de /processing à /verify sans passer
 * par l'URL (l'URL ne porte que le numero_cni). Le fallback de /verify reste
 * useCniDetail(numero) si l'utilisateur arrive en accès direct.
 */
let lastExtraction: CniExtractionResponse | null = null;

export function setLastExtraction(extraction: CniExtractionResponse | null): void {
  lastExtraction = extraction;
}

export function getLastExtraction(): CniExtractionResponse | null {
  return lastExtraction;
}
