// D1 side of the LeCoin store. The rules live in the engine; this file is the
// I/O around them — the catalog, get-or-create wallets, and the debit.
import {
  STARTING_LECOIN,
  normalizeUsername,
  ownedCounts,
  applyPurchase,
  type Product,
  type Booth,
  type OwnedItem,
  type TransactionKind,
} from "@typohero/engine";

export type WalletView = {
  username: string;
  displayName: string;
  balance: number;
  owned: OwnedItem[];
};

export type PurchaseResult =
  | { ok: true; balance: number; transactionId: string; productId: string }
  | { ok: false; error: "unknown_product" | "insufficient_funds"; balance: number };

type ProductRow = {
  id: string;
  booth: string;
  name: string;
  description: string;
  price: number;
  icon: string;
  sort_order: number;
};

function toProduct(r: ProductRow): Product {
  return {
    id: r.id,
    booth: r.booth as Booth,
    name: r.name,
    description: r.description,
    price: r.price,
    icon: r.icon,
    sortOrder: r.sort_order,
  };
}

export async function listProducts(db: D1Database): Promise<Product[]> {
  const { results } = await db
    .prepare(
      `SELECT id, booth, name, description, price, icon, sort_order
       FROM products WHERE active = 1 ORDER BY booth, sort_order, name`,
    )
    .all<ProductRow>();
  return results.map(toProduct);
}

async function getProduct(db: D1Database, id: string): Promise<Product | null> {
  const row = await db
    .prepare(
      `SELECT id, booth, name, description, price, icon, sort_order
       FROM products WHERE id = ? AND active = 1`,
    )
    .bind(id)
    .first<ProductRow>();
  return row ? toProduct(row) : null;
}

async function ownedFor(db: D1Database, username: string): Promise<OwnedItem[]> {
  const { results } = await db
    .prepare(`SELECT kind, product_id FROM transactions WHERE username = ? ORDER BY created_at`)
    .bind(username)
    .all<{ kind: string; product_id: string | null }>();
  return ownedCounts(
    results.map((r) => ({ kind: r.kind as TransactionKind, productId: r.product_id })),
  );
}

/**
 * The wallet for a typed-in username, created and credited its opening balance
 * the first time we see it. Null if the name is empty.
 *
 * The grant is written as a ledger row so every coin in circulation is
 * explained by a transaction, not conjured by a default column value.
 */
export async function getOrCreateWallet(
  db: D1Database,
  rawUsername: string,
): Promise<WalletView | null> {
  const username = normalizeUsername(rawUsername);
  if (!username) return null;
  const displayName = rawUsername.trim();
  const now = Date.now();

  // ON CONFLICT DO NOTHING makes the create idempotent under a double-click:
  // only the insert that actually landed writes the opening grant.
  const created = await db
    .prepare(
      `INSERT INTO wallets (username, display_name, balance, created_at)
       VALUES (?, ?, ?, ?) ON CONFLICT(username) DO NOTHING`,
    )
    .bind(username, displayName, STARTING_LECOIN, now)
    .run();

  if (created.meta.changes === 1) {
    await db
      .prepare(
        `INSERT INTO transactions (id, username, kind, product_id, amount, balance_after, created_at)
         VALUES (?, ?, 'grant', NULL, ?, ?, ?)`,
      )
      .bind(crypto.randomUUID(), username, STARTING_LECOIN, STARTING_LECOIN, now)
      .run();
  } else {
    // Returning player: keep the nameplate spelling they used most recently.
    await db
      .prepare(`UPDATE wallets SET display_name = ? WHERE username = ?`)
      .bind(displayName, username)
      .run();
  }

  const wallet = await db
    .prepare(`SELECT username, display_name, balance FROM wallets WHERE username = ?`)
    .bind(username)
    .first<{ username: string; display_name: string; balance: number }>();
  if (!wallet) return null;

  return {
    username: wallet.username,
    displayName: wallet.display_name,
    balance: wallet.balance,
    owned: await ownedFor(db, username),
  };
}

/**
 * Spend LeCoin on one item.
 *
 * D1 has no interactive transactions, so the debit is a conditional write and
 * the receipt is a second statement. A crash between the two would debit a
 * wallet without recording why — acceptable at talent-show scale. The part that
 * matters under concurrent buys is safe: `balance >= price` lives in the UPDATE,
 * so two simultaneous purchases can never overdraw a wallet.
 */
export async function purchase(
  db: D1Database,
  rawUsername: string,
  productId: string,
): Promise<PurchaseResult | null> {
  const wallet = await getOrCreateWallet(db, rawUsername);
  if (!wallet) return null;

  const product = await getProduct(db, productId);
  if (!product) return { ok: false, error: "unknown_product", balance: wallet.balance };

  // Pre-flight against the engine rules so an unaffordable buy never touches D1.
  const step = applyPurchase(wallet.balance, product);
  if (!step) return { ok: false, error: "insufficient_funds", balance: wallet.balance };

  const debit = await db
    .prepare(`UPDATE wallets SET balance = balance - ?1 WHERE username = ?2 AND balance >= ?1`)
    .bind(product.price, wallet.username)
    .run();

  // Zero rows means someone else spent the coins between our read and write.
  if (debit.meta.changes !== 1) {
    const now = await db
      .prepare(`SELECT balance FROM wallets WHERE username = ?`)
      .bind(wallet.username)
      .first<{ balance: number }>();
    return { ok: false, error: "insufficient_funds", balance: now?.balance ?? wallet.balance };
  }

  const transactionId = crypto.randomUUID();
  await db
    .prepare(
      `INSERT INTO transactions (id, username, kind, product_id, amount, balance_after, created_at)
       VALUES (?, ?, 'purchase', ?, ?, ?, ?)`,
    )
    .bind(transactionId, wallet.username, product.id, step.amount, step.balance, Date.now())
    .run();

  return { ok: true, balance: step.balance, transactionId, productId: product.id };
}
