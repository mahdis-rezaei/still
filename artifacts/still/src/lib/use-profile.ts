import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  customFetch,
  getGetCurrentUserQueryKey,
  type AuthUser,
} from "@workspace/api-client-react";

// PATCH /auth/me — update the display name. Hand-written (not codegen) per the
// repo's generated-files caveat; on success it primes the same query cache the
// auth context reads, so the nav + settings reflect the new name immediately.
export function useUpdateProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (b: { name: string }) =>
      customFetch<AuthUser>("/api/auth/me", {
        method: "PATCH",
        body: JSON.stringify(b),
        responseType: "json",
      }),
    onSuccess: (user) => {
      qc.setQueryData(getGetCurrentUserQueryKey(), user);
    },
  });
}
