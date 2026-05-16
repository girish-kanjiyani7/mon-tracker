"use client";

import { useCallback, useEffect, useState } from "react";
import { usePlaidLink, PlaidLinkOnSuccess, PlaidLinkOnExit } from "react-plaid-link";

interface Props {
  onSuccess?: () => void;
}

async function createLinkToken(): Promise<string | null> {
  const res = await fetch("/api/plaid/create-link-token", { method: "POST" });
  if (!res.ok) return null;
  const data = await res.json();
  return data.link_token ?? null;
}

export function PlaidLinkButton({ onSuccess }: Props) {
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [error, setError] = useState(false);

  const fetchToken = useCallback(async () => {
    setError(false);
    const token = await createLinkToken();
    if (token) {
      setLinkToken(token);
    } else {
      setError(true);
    }
  }, []);

  useEffect(() => { fetchToken(); }, [fetchToken]);

  const handleSuccess = useCallback<PlaidLinkOnSuccess>(
    async (publicToken, metadata) => {
      await fetch("/api/plaid/exchange-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          public_token: publicToken,
          institution_id: metadata.institution?.institution_id ?? null,
          institution_name: metadata.institution?.name ?? null,
        }),
      });
      onSuccess?.();
    },
    [onSuccess]
  );

  const handleExit = useCallback<PlaidLinkOnExit>(
    (err) => {
      if (err?.error_code === "INVALID_LINK_TOKEN") {
        setLinkToken(null);
        fetchToken();
      }
    },
    [fetchToken]
  );

  const { open, ready } = usePlaidLink({
    token: linkToken ?? "",
    onSuccess: handleSuccess,
    onExit: handleExit,
  });

  if (error) {
    return (
      <button
        onClick={fetchToken}
        className="h-9 rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 text-sm font-medium text-rose-400 hover:bg-rose-500/20 transition-colors"
      >
        Retry
      </button>
    );
  }

  return (
    <button
      onClick={() => open()}
      disabled={!ready || !linkToken}
      className="h-9 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
    >
      Connect Account
    </button>
  );
}
