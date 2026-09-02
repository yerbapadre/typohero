import { describe, it, expect } from "vitest";
import {
  STARTING_LECOIN,
  normalizeUsername,
  canAfford,
  applyPurchase,
  ownedCounts,
  type Product,
} from "./store";

const boat: Product = {
  id: "seths-boat",
  booth: "merch",
  name: "Seth's Boat",
  description: "Not a boat payment. The boat.",
  price: 450,
  icon: "/store/seths-boat.png",
  sortOrder: 3,
};

describe("normalizeUsername", () => {
  it("lowercases and trims", () => {
    expect(normalizeUsername("  FrogSinatra  ")).toBe("frogsinatra");
  });

  it("collapses inner whitespace so 'frog  sinatra' is one wallet", () => {
    expect(normalizeUsername("frog   sinatra")).toBe("frog sinatra");
  });

  it("is null for a name that is empty or only whitespace", () => {
    expect(normalizeUsername("")).toBeNull();
    expect(normalizeUsername("   ")).toBeNull();
  });
});

describe("canAfford", () => {
  it("allows a purchase that spends the balance exactly", () => {
    expect(canAfford(450, 450)).toBe(true);
  });

  it("rejects a purchase one coin short", () => {
    expect(canAfford(449, 450)).toBe(false);
  });
});

describe("applyPurchase", () => {
  it("debits the price and reports the signed amount", () => {
    expect(applyPurchase(STARTING_LECOIN, boat)).toEqual({
      balance: STARTING_LECOIN - 450,
      amount: -450,
    });
  });

  it("is null when the wallet cannot cover the price", () => {
    expect(applyPurchase(449, boat)).toBeNull();
  });
});

describe("ownedCounts", () => {
  it("tallies purchases per product and ignores grants", () => {
    const owned = ownedCounts([
      { kind: "grant", productId: null },
      { kind: "purchase", productId: "diet-coke" },
      { kind: "purchase", productId: "diet-coke" },
      { kind: "purchase", productId: "seths-boat" },
    ]);
    expect(owned).toEqual([
      { productId: "diet-coke", count: 2 },
      { productId: "seths-boat", count: 1 },
    ]);
  });

  it("is empty for a wallet that has only been granted coins", () => {
    expect(ownedCounts([{ kind: "grant", productId: null }])).toEqual([]);
  });
});

describe("STARTING_LECOIN", () => {
  it("is a positive whole number of coins", () => {
    expect(Number.isInteger(STARTING_LECOIN)).toBe(true);
    expect(STARTING_LECOIN).toBeGreaterThan(0);
  });
});
