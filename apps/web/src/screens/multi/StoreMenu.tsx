import type { ReactNode } from "react";
import type { Product } from "@typohero/engine";
import type { Store } from "../../net/useStore";

// The menu behind a booth. Opens over the whole show when you press Enter in
// front of a spot or click it — `fixed`, not `absolute`, because the pit it is
// rendered inside is only a short strip at the foot of the screen, and the
// menu is meant to cover the stage. Cabinet language: hard edges, offset
// shadow, amber reserved for the price, the balance, and the buy button.

/** Product art is a path ('/store/x.png'); anything else is an emoji. */
function ProductIcon({ icon, size }: { icon: string; size: string }) {
  if (icon.startsWith("/")) {
    return <img src={icon} alt="" draggable={false} className={size + " w-auto object-contain"} />;
  }
  return <span className={"grid place-items-center " + size + " text-5xl leading-none"}>{icon}</span>;
}

export function LeCoin({ amount, className = "" }: { amount: number; className?: string }) {
  return (
    <span className={"whitespace-nowrap " + className}>
      <span className="mr-1 border border-cabinet-accent bg-cabinet-accent px-1 text-[9px] text-cabinet-ink">
        Ⱡ
      </span>
      {amount}
    </span>
  );
}

function ProductCard({
  product,
  balance,
  owned,
  onBuy,
}: {
  product: Product;
  balance: number;
  owned: number;
  onBuy: () => void;
}) {
  const short = product.price - balance;
  const affordable = short <= 0;

  return (
    <div className="flex flex-col border-2 border-cabinet-border bg-black/25 p-3">
      <div className="relative grid h-32 place-items-center border-2 border-cabinet-frame bg-black/40 p-2">
        <ProductIcon icon={product.icon} size="max-h-28" />
        {owned > 0 && (
          <span className="absolute right-1 top-1 border border-cabinet-frame bg-cabinet-bg px-1 text-[8px] uppercase tracking-widest text-cabinet-text/60">
            ×{owned}
          </span>
        )}
      </div>

      <div className="mt-3 text-[11px] uppercase leading-tight tracking-widest text-cabinet-text">
        {product.name}
      </div>
      {/* Silkscreen is unreadable at paragraph length — flavor text goes mono. */}
      <p className="mt-1 flex-1 font-mono text-[10px] lowercase leading-snug text-cabinet-text/55">
        {product.description}
      </p>

      <div className="mt-3 flex items-center justify-between gap-2">
        <LeCoin amount={product.price} className="text-sm text-cabinet-accent" />
        <button
          onClick={onBuy}
          disabled={!affordable}
          className={
            "border-2 px-4 py-2 text-[9px] uppercase tracking-widest transition-colors " +
            (affordable
              ? "border-cabinet-accent bg-cabinet-accent text-cabinet-ink"
              : "cursor-not-allowed border-cabinet-border bg-cabinet-btn text-cabinet-text/30")
          }
        >
          {affordable ? "Buy" : `need ${short}`}
        </button>
      </div>
    </div>
  );
}

export function StoreMenu({
  label,
  products,
  store,
  onBuy,
  onClose,
  tabs,
}: {
  label: string;
  /** Already filtered to this booth. */
  products: Product[] | null;
  store: Store;
  onBuy: (productId: string) => void;
  onClose: () => void;
  /** Booth switcher, when this booth is more than just a shop. */
  tabs?: ReactNode;
}) {
  const balance = store.wallet?.balance ?? 0;

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/75 p-4 md:p-8"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[88vh] w-full max-w-5xl flex-col border-[3px] border-cabinet-accent bg-cabinet-bg p-6 shadow-[10px_10px_0_#6b4e18]"
      >
        <div className="flex shrink-0 items-center justify-between gap-4 border-b-2 border-cabinet-frame pb-4">
          <span className="text-xl uppercase tracking-[0.3em] text-cabinet-accent md:text-2xl">
            {label}
          </span>
          <span className="text-[10px] uppercase tracking-widest text-cabinet-text/50 md:text-xs">
            balance <LeCoin amount={balance} className="text-base text-cabinet-accent" />
          </span>
        </div>

        {/* min-h-0 is load-bearing: a flex child defaults to min-height:auto,
            which refuses to shrink below its content, so the panel would grow
            past max-h and the overflow would never scroll. */}
        {tabs && <div className="mt-4 shrink-0">{tabs}</div>}

        <div className="-mr-2 mt-5 min-h-0 flex-1 overflow-y-auto pr-2">
          {products === null && (
            <div className="py-16 text-center font-mono text-xs lowercase text-cabinet-text/40">
              opening the till…
            </div>
          )}

          {products?.length === 0 && (
            <div className="py-16 text-center font-mono text-xs lowercase text-cabinet-text/40">
              nothing on the table yet
            </div>
          )}

          {products && products.length > 0 && (
            // Three across on a big screen: a 3x2 grid of stock without scrolling.
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {products.map((p) => (
                <ProductCard
                  key={p.id}
                  product={p}
                  balance={balance}
                  owned={store.ownedCount(p.id)}
                  onBuy={() => onBuy(p.id)}
                />
              ))}
            </div>
          )}
        </div>

        {store.error && (
          <div className="mt-4 shrink-0 border-2 border-cabinet-border bg-black/40 p-2 text-center font-mono text-[11px] lowercase text-cabinet-text/60">
            {store.error}
          </div>
        )}

        <button
          onClick={onClose}
          className="mt-5 shrink-0 border-2 border-cabinet-border bg-cabinet-btn px-4 py-3 text-[10px] uppercase tracking-widest text-cabinet-text hover:border-cabinet-accent md:text-xs"
        >
          Esc · close
        </button>
      </div>
    </div>
  );
}
