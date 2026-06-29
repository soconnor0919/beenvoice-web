import {
  defaultShouldDehydrateQuery,
  QueryClient,
  QueryCache,
  MutationCache,
} from "@tanstack/react-query";
import { TRPCClientError } from "@trpc/client";
import { toast } from "sonner";
import SuperJSON from "superjson";

function isUnauthorized(error: unknown): boolean {
  return (
    error instanceof TRPCClientError &&
    error.data != null &&
    typeof error.data === "object" &&
    "code" in error.data &&
    (error.data as { code: string }).code === "UNAUTHORIZED"
  );
}

function isRateLimited(error: unknown): boolean {
  if (!(error instanceof TRPCClientError)) return false;
  if (error.data != null && typeof error.data === "object" && "code" in error.data) {
    if ((error.data as { code: string }).code === "TOO_MANY_REQUESTS") return true;
  }
  const message = error.message.toLowerCase();
  return message.includes("too many") || message.includes("rate limit");
}

function handleQueryError(error: unknown) {
  if (isRateLimited(error)) {
    toast.error("Too many requests. Please wait a moment and try again.");
    return;
  }
  if (isUnauthorized(error)) {
    toast.error("Please sign in to continue");
    if (typeof window !== "undefined") {
      window.location.href = "/auth/signin";
    }
  }
}

export const createQueryClient = () =>
  new QueryClient({
    queryCache: new QueryCache({ onError: handleQueryError }),
    mutationCache: new MutationCache({ onError: handleQueryError }),
    defaultOptions: {
      queries: {
        staleTime: 30 * 1000,
        retry: (failureCount, error) => {
          if (isUnauthorized(error) || isRateLimited(error)) return false;
          return failureCount < 1;
        },
      },
      mutations: {
        retry: (failureCount, error) => {
          if (isRateLimited(error)) return false;
          return failureCount < 1;
        },
      },
      dehydrate: {
        serializeData: SuperJSON.serialize,
        shouldDehydrateQuery: (query) =>
          defaultShouldDehydrateQuery(query) ||
          query.state.status === "pending",
      },
      hydrate: {
        deserializeData: SuperJSON.deserialize,
      },
    },
  });
