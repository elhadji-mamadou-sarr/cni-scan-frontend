/** Clés de cache react-query centralisées, pour des invalidations cohérentes. */
export interface CnisQueryParams {
  offset?: number;
  limit?: number;
  search?: string;
}

export const queryKeys = {
  health: ["health"] as const,
  stats: ["stats"] as const,
  /** Préfixe commun à toutes les listes (invalidation groupée). */
  cnisAll: ["cnis"] as const,
  cnis: (params: CnisQueryParams) => ["cnis", params] as const,
  cni: (numero: string) => ["cni", numero] as const,
};
