import { describe, it, expect } from "vitest";
import { run } from "./run";
import type { RunInput, FunctionRunResult } from "../generated/api";
import { DiscountApplicationStrategy } from "../generated/api";

describe("run function", () => {
  it("returns no discounts if user is not authenticated", () => {
    const input: RunInput = {
      cart: {
        buyerIdentity: {
          isAuthenticated: false,
          customer: null,
        },
        lines: [],
      },
    };

    const result = run(input);
    console.log("Test Output (Unauthenticated User):", JSON.stringify(result, null, 2));

    expect(result).toEqual({
      discounts: [],
      discountApplicationStrategy: DiscountApplicationStrategy.First,
    });
  });

  it("applies a discount and logs full discount details", () => {
    const input: RunInput = {
      cart: {
        buyerIdentity: {
          isAuthenticated: true,
          customer: {
            hasTags: [{ hasTag: true, tag: "efp-discount-5" }],
            email: "marissaurbank+15percent@gmail.com",
          },
        },
        lines: [
          {
            id: "line_001",
            quantity: 1,
            cost: { compareAtAmountPerQuantity: null },
            merchandise: {
              __typename: "ProductVariant",
              product: { title: "Brewdog Beer Pack" },
            },
          },
        ],
      },
    };

    const result = run(input);
    console.log("Full Discount Details:", JSON.stringify(result, null, 2));

    expect(result.discounts.length).toBe(1);
    expect(result.discounts[0].value.percentage.value).toBe("15.0");
  });
});
