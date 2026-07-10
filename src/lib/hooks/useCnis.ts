import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { listCni } from "@/lib/api";
import { queryKeys, type CnisQueryParams } from "./keys";

/** Liste paginée des CNI + recherche. Renvoie { items, total } pour la pagination. */
export function useCnis(params: CnisQueryParams = {}) {
  const { offset = 0, limit = 20, search } = params;
  return useQuery({
    queryKey: queryKeys.cnis({ offset, limit, search }),
    queryFn: () => listCni({ offset, limit, search }),
    // Évite le clignotement de la table pendant un changement de page/recherche.
    placeholderData: keepPreviousData,
  });
}
