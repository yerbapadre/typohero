// LeCoin — the crowd's spending money at the pit booths. Pure rules only: the
// wallet itself lives in D1 behind the Worker, and every coin that exists was
// either granted on a wallet's first touch or moved by a purchase.

/** Coins a username is credited the first time it is seen. The one knob. */
export const STARTING_LECOIN = 500;

/** The hangout spots along the front of the stage that sell things. */
export type Booth = "merch" | "bar" | "recs";

export type Product = {
  id: string;
  booth: Booth;
  name: string;
  description: string;
  price: number;
  /** An emoji, or an asset path beginning with "/" (rendered as an image). */
  icon: string;
  sortOrder: number;
};

export type Wallet = {
  /** Normalized — the wallet key. */
  username: string;
  /** As the user typed it; the nameplate spelling. */
  displayName: string;
  balance: number;
};

export type TransactionKind = "grant" | "purchase";

export type OwnedItem = { productId: string; count: number };

/**
 * Wallet key for a typed-in username. Spectator ids are regenerated on every
 * page load, so the name is the only durable identity we have — which means
 * "Frog  Sinatra" and "frog sinatra" have to land on the same wallet.
 * Null for a name with nothing in it.
 */
export function normalizeUsername(raw: string): string | null {
  const clean = raw.trim().toLowerCase().replace(/\s+/g, " ");
  return clean.length > 0 ? clean : null;
}

export function canAfford(balance: number, price: number): boolean {
  return balance >= price;
}

/**
 * The debit, as a pure step: the balance left and the signed ledger amount.
 * Null means the wallet can't cover it — the caller writes nothing.
 */
export function applyPurchase(
  balance: number,
  product: Product,
): { balance: number; amount: number } | null {
  if (!canAfford(balance, product.price)) return null;
  return { balance: balance - product.price, amount: -product.price };
}

/**
 * What a wallet owns, derived from its ledger — there is no inventory table,
 * so the transactions *are* the inventory. Grants carry no product and drop out.
 */
export function ownedCounts(
  transactions: { kind: TransactionKind; productId: string | null }[],
): OwnedItem[] {
  const counts = new Map<string, number>();
  for (const t of transactions) {
    if (t.kind !== "purchase" || !t.productId) continue;
    counts.set(t.productId, (counts.get(t.productId) ?? 0) + 1);
  }
  return [...counts].map(([productId, count]) => ({ productId, count }));
}
