-- LeCoin store: what the crowd can buy at the pit booths, who has coins, and
-- where every coin went. There is deliberately no inventory table — what a
-- wallet owns is a query over `transactions`, so the two can never disagree.

CREATE TABLE wallets (
  username     TEXT PRIMARY KEY,   -- normalized: trimmed, lowercased, inner whitespace collapsed
  display_name TEXT NOT NULL,      -- as typed; most recent spelling wins
  balance      INTEGER NOT NULL,
  created_at   INTEGER NOT NULL
);

CREATE TABLE products (
  id          TEXT PRIMARY KEY,
  booth       TEXT NOT NULL,            -- 'merch' | 'bar' | 'recs'
  name        TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  price       INTEGER NOT NULL,
  icon        TEXT NOT NULL,            -- an emoji, or an asset path beginning with '/'
  sort_order  INTEGER NOT NULL DEFAULT 0,
  active      INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE transactions (
  id            TEXT PRIMARY KEY,
  username      TEXT NOT NULL REFERENCES wallets(username),
  kind          TEXT NOT NULL,      -- 'grant' | 'purchase'
  product_id    TEXT,               -- NULL for 'grant'
  amount        INTEGER NOT NULL,   -- signed: +grant, -purchase
  balance_after INTEGER NOT NULL,
  created_at    INTEGER NOT NULL
);

CREATE INDEX idx_transactions_username ON transactions(username, created_at);
