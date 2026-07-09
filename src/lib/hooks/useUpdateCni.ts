import { useMutation, useQueryClient } from "@tanstack/react-query";

import { patchCni } from "@/lib/api";
import type { ApiError } from "@/lib/api";
import type { CniDetail, CniUpdateIn } from "@/lib/types";
import { queryKeys } from "./keys";

type UpdateVariables = { numero: string; updates: CniUpdateIn };

/**
 * Correction manuelle (PATCH /cni/{numero}). Met à jour le cache détail et
 * invalide les listes 'cnis', la fiche 'cni' concernée et les stats.
 */
export function useUpdateCni() {
  const queryClient = useQueryClient();
  return useMutation<CniDetail, ApiError, UpdateVariables>({
    mutationFn: ({ numero, updates }) => patchCni(numero, updates),
    onSuccess: (data, { numero }) => {
      queryClient.setQueryData(queryKeys.cni(numero), data);
      void queryClient.invalidateQueries({ queryKey: queryKeys.cnisAll });
      void queryClient.invalidateQueries({ queryKey: queryKeys.cni(numero) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.stats });
    },
  });
}
