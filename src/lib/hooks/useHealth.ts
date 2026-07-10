import { useQuery } from "@tanstack/react-query";

import { health } from "@/lib/api";
import { queryKeys } from "./keys";

/** État du backend (DB + Tesseract). Rafraîchi périodiquement pour le badge health. */
export function useHealth() {
  return useQuery({
    queryKey: queryKeys.health,
    queryFn: health,
    refetchInterval: 30_000,
    retry: false,
    staleTime: 10_000,
  });
}
