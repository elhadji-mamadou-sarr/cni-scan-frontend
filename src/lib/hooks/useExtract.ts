import { useMutation, useQueryClient } from "@tanstack/react-query";

import { postExtract } from "@/lib/api";
import type { ApiError } from "@/lib/api";
import type { CniExtractionResponse } from "@/lib/types";
import { queryKeys } from "./keys";

type ExtractVariables = { recto: File; verso: File; persist?: boolean };

/** Extraction OCR (POST /extract). Invalide liste + stats en cas de persistance. */
export function useExtract() {
  const queryClient = useQueryClient();
  return useMutation<CniExtractionResponse, ApiError, ExtractVariables>({
    mutationFn: postExtract,
    onSuccess: (data) => {
      if (data.persisted) {
        void queryClient.invalidateQueries({ queryKey: queryKeys.cnisAll });
        void queryClient.invalidateQueries({ queryKey: queryKeys.stats });
      }
    },
  });
}
