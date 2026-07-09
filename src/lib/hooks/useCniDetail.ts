import { useQuery } from "@tanstack/react-query";

import { getCniDetail } from "@/lib/api";
import { queryKeys } from "./keys";

/** Fiche complète (recto + verso) d'une carte. Désactivé si `numero` est vide. */
export function useCniDetail(numero: string | undefined) {
  return useQuery({
    queryKey: queryKeys.cni(numero ?? ""),
    queryFn: () => getCniDetail(numero as string),
    enabled: Boolean(numero),
  });
}
