import type { Product } from "@typohero/engine";
import type { Store } from "../../net/useStore";

// The menu behind a booth. Opens over the pit when you press Enter in front of
// a spot or click it. Cabinet language: hard edges, offset shadow, amber used
// only for the price, the balance, and the button you're meant to press.

/** Product art is a path ('/store/x.png'); anything else is an emoji. */
function ProductIcon({ icon, size }: { icon: string; size: string }) {
  if (icon.startsWith("/")) {
    return <img src={icon} alt="" draggable={false} className={size + " w-auto object-contain"} />;
  }
  return <span className={"grid place-items-center " + size + " text-3xl leading-none"}>{icon}</span>;
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

function ProductRow({
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
    <div className="flex items-center gap-4 border-2 border-cabinet-border bg-black/25 p-3">
      <div className="grid h-16 w-16 shrink-0 place-items-center border-2 border-cabinet-frame bg-black/40">
        <ProductIcon icon={product.icon} size="h-14" />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <span className="truncate text-[11px] uppercase tracking-widest text-cabinet-text">
            {product.name}
          </span>
          {owned > 0 && (
            <span className="shrink-0 border border-cabinet-frame px-1 text-[8px] uppercase tracking-widest text-cabinet-text/50">
              owned {owned}
            </span>
          )}
        </div>
        {/* Silkscreen is unreadable at paragraph length — flavor text goes mono. */}
        <p className="mt-1 font-mono text-[10px] lowercase leading-snug text-cabinet-text/55">
          {product.description}
        </p>
      </div>

      <div className="flex shrink-0 flex-col items-end gap-1">
        <LeCoin amount={product.price} className="text-xs text-cabinet-accent" />
        <button
          onClick={onBuy}
          disabled={!affordable}
          className={
            "border-2 px-3 py-2 text-[9px] uppercase tracking-widest transition-colors " +
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
}: {
  label: string;
  /** Already filtered to this booth. */
  products: Product[] | null;
  store: Store;
  onBuy: (productId: string) => void;
  onClose: () => void;
}) {
  const balance = store.wallet?.balance ?? 0;

  return (
    <div
      className="absolute inset-0 z-30 grid place-items-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="max-h-full w-full max-w-lg overflow-y-auto border-[3px] border-cabinet-accent bg-cabinet-bg p-5 shadow-[8px_8px_0_#6b4e18]"
      >
        <div className="flex items-center justify-between border-b-2 border-cabinet-frame pb-3">
          <span className="text-sm uppercase tracking-[0.25em] text-cabinet-accent">{label}</span>
          <span className="text-[10px] uppercase tracking-widest text-cabinet-text/50">
            balance <LeCoin amount={balance} className="text-cabinet-accent" />
          </span>
        </div>

        <div className="mt-4 flex flex-col gap-2">
          {products === null && (
            <div className="py-8 text-center font-mono text-[11px] lowercase text-cabinet-text/40">
              opening the till…
            </div>
          )}

          {products?.length === 0 && (
            <div className="py-8 text-center font-mono text-[11px] lowercase text-cabinet-text/40">
              nothing on the table yet
            </div>
          )}

          {products?.map((p) => (
            <ProductRow
              key={p.id}
              product={p}
              balance={balance}
              owned={store.ownedCount(p.id)}
              onBuy={() => onBuy(p.id)}
            />
          ))}
        </div>

        {store.error && (
          <div className="mt-3 border-2 border-cabinet-border bg-black/40 p-2 text-center font-mono text-[10px] lowercase text-cabinet-text/60">
            {store.error}
          </div>
        )}

        <button
          onClick={onClose}
          className="mt-4 w-full border-2 border-cabinet-border bg-cabinet-btn px-4 py-3 text-[10px] uppercase tracking-widest text-cabinet-text hover:border-cabinet-accent"
        >
          Esc · close
        </button>
      </div>
    </div>
  );
}
