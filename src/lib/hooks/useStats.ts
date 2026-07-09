import { useQuery } from "@tanstack/react-query";

import { getStats } from "@/lib/api";
import { queryKeys } from "./keys";

/** KPIs du dashboard (total, cartes du jour, répartition par région). */
export function useStats() {
  return useQuery({
    queryKey: queryKeys.stats,
    queryFn: getStats,
  });
}
