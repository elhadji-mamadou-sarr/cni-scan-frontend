/**
 * Types TypeScript strictement alignés sur les schémas Pydantic du backend
 * (src/cni_ocr/schemas.py). Les dates sont des chaînes ISO "YYYY-MM-DD".
 * Un champ non extrait vaut `null` (jamais `undefined`) côté réponse.
 */

/** Date ISO au format "YYYY-MM-DD" (sérialisation Pydantic de `date`). */
export type IsoDate = string;

/** Champs du recto d'une CNI (CniRectoOut). */
export interface CniRectoOut {
  numero_cni: string;
  prenom: string | null;
  nom: string | null;
  sexe: string | null;
  taille: number | null;
  lieu_naissance: string | null;
  date_delivrance: IsoDate | null;
  date_expiration: IsoDate | null;
  centre_enregistrement: string | null;
  adresse_domicile: string | null;
}

/** Champs du verso d'une CNI + MRZ brute (CniVersoOut). */
export interface CniVersoOut {
  code_pays: string | null;
  numero_electeur: string | null;
  region: string | null;
  departement: string | null;
  arrondissement: string | null;
  commune: string | null;
  lieu_vote: string | null;
  bureau: string | null;
  nin: string | null;
  mrz_ligne1: string | null;
  mrz_ligne2: string | null;
  mrz_ligne3: string | null;
}

/** Réponse de POST /extract (CniExtractionResponse). */
export interface CniExtractionResponse {
  recto: CniRectoOut;
  verso: CniVersoOut;
  warnings: string[];
  persisted: boolean;
}

/** Fiche complète recto + verso (CniDetailOut), renvoyée par /detail et PATCH. */
export interface CniDetail {
  recto: CniRectoOut;
  verso: CniVersoOut;
}

/** Réponse de GET /health (HealthResponse). */
export interface HealthResponse {
  status: "ok" | "degraded" | (string & {});
  database: boolean;
  tesseract: boolean;
}

/** Une entrée de répartition régionale du dashboard. */
export interface RegionCount {
  region: string;
  count: number;
}

/** Réponse de GET /stats (StatsResponse). */
export interface Stats {
  total_cartes: number;
  cartes_aujourd_hui: number;
  repartition_par_region: RegionCount[];
}

/**
 * Résultat paginé de GET /cni : le corps reste un tableau `CniRectoOut[]`,
 * le total (header `X-Total-Count`) est remonté ici pour la pagination.
 */
export interface CniListResult {
  items: CniRectoOut[];
  total: number;
}

/**
 * Corps du PATCH /cni/{numero} (CniUpdateIn). Tous les champs sont optionnels.
 * `numero_cni` n'est PAS modifiable (identité de la carte, portée par l'URL).
 * Envoyer un champ à `null` l'efface ; l'omettre le laisse inchangé.
 */
export type CniRectoUpdate = Partial<Omit<CniRectoOut, "numero_cni">>;
export type CniVersoUpdate = Partial<CniVersoOut>;

export interface CniUpdateIn {
  recto?: CniRectoUpdate;
  verso?: CniVersoUpdate;
}
