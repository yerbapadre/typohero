import { useCallback, useEffect, useState } from "react";
import type { Product, OwnedItem } from "@typohero/engine";

export type StoreWallet = {
  username: string;
  displayName: string;
  balance: number;
  owned: OwnedItem[];
};

export type Store = {
  products: Product[] | null;
  wallet: StoreWallet | null;
  /** Set on a failed buy, cleared on the next attempt. */
  error: string | null;
  buy: (productId: string) => Promise<boolean>;
  ownedCount: (productId: string) => number;
};

type PurchaseResponse =
  | { ok: true; balance: number; transactionId: string; productId: string }
  | { ok: false; error: string; balance: number };

/**
 * The crowd's wallet and the booth catalog. The username is the wallet key, so
 * this hook idles until there is one. Purchases are authoritative on the server;
 * we take the balance it hands back rather than guessing locally.
 */
export function useStore(username: string | null): Store {
  const [products, setProducts] = useState<Product[] | null>(null);
  const [wallet, setWallet] = useState<StoreWallet | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/store/products", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : []))
      .then((data: Product[]) => setProducts(data))
      .catch(() => setProducts([]));
  }, []);

  useEffect(() => {
    if (!username) return;
    let live = true;
    fetch("/api/store/wallet", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username }),
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((w: StoreWallet | null) => {
        if (live && w) setWallet(w);
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [username]);

  const buy = useCallback(
    async (productId: string): Promise<boolean> => {
      if (!username) return false;
      setError(null);
      try {
        const res = await fetch("/api/store/purchase", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username, productId }),
        });
        const data = (await res.json()) as PurchaseResponse;
        if (!data.ok) {
          // Even a rejection carries the real balance — take it, in case another
          // tab spent the coins out from under this one.
          setWallet((w) => (w ? { ...w, balance: data.balance } : w));
          setError(
            data.error === "insufficient_funds" ? "not enough lecoin" : "sold out of that one",
          );
          return false;
        }
        setWallet((w) =>
          w
            ? { ...w, balance: data.balance, owned: addOwned(w.owned, productId) }
            : w,
        );
        return true;
      } catch {
        setError("the booth didn't answer");
        return false;
      }
    },
    [username],
  );

  const ownedCount = useCallback(
    (productId: string) => wallet?.owned.find((o) => o.productId === productId)?.count ?? 0,
    [wallet],
  );

  return { products, wallet, error, buy, ownedCount };
}

function addOwned(owned: OwnedItem[], productId: string): OwnedItem[] {
  const hit = owned.find((o) => o.productId === productId);
  if (!hit) return [...owned, { productId, count: 1 }];
  return owned.map((o) => (o.productId === productId ? { ...o, count: o.count + 1 } : o));
}
