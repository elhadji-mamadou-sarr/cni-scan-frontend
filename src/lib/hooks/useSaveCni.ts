import { useMutation, useQueryClient } from "@tanstack/react-query";

import { postCni } from "@/lib/api";
import type { ApiError } from "@/lib/api";
import type { CniCreateIn, CniDetail } from "@/lib/types";
import { queryKeys } from "./keys";

/**
 * Enregistre une carte extraite (POST /cni) au moment de la validation.
 * Met à jour le cache détail et invalide les listes + stats.
 */
export function useSaveCni() {
  const queryClient = useQueryClient();
  return useMutation<CniDetail, ApiError, CniCreateIn>({
    mutationFn: postCni,
    onSuccess: (data) => {
      queryClient.setQueryData(queryKeys.cni(data.recto.numero_cni), data);
      void queryClient.invalidateQueries({ queryKey: queryKeys.cnisAll });
      void queryClient.invalidateQueries({ queryKey: queryKeys.stats });
    },
  });
}
