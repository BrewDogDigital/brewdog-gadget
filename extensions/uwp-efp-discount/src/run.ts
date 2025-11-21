import type {
  RunInput,
  FunctionRunResult,
  Target
} from "../generated/api";
import {
  DiscountApplicationStrategy,
} from "../generated/api";

const EMPTY_DISCOUNT: FunctionRunResult = {
  discountApplicationStrategy: DiscountApplicationStrategy.First,
  discounts: [],
};

type Configuration = {};

export function run(input: RunInput): FunctionRunResult {
  const isAuthenticated = input.cart.buyerIdentity?.isAuthenticated;
  console.log('isAuthenticated', isAuthenticated);
  if (!isAuthenticated) {
    return EMPTY_DISCOUNT;
  }

  const tags = input.cart.buyerIdentity?.customer?.hasTags.filter((tag) => tag.hasTag).map((tag) => tag.tag);
  console.log('tags', tags);

  if (!tags) {
    return EMPTY_DISCOUNT;
  }

  const discountTag = tags
  .filter((tag) => tag.startsWith('efp-discount-'))
  .map((tag) => Number(tag.replace('efp-discount-', ''))) // Convert to numbers
  .reduce((max, value) => Math.max(max, value), 0); // Get the highest discount



  const staffTag = tags.find((tag) => tag.startsWith('staff'));
  console.log('staffTag', staffTag);
  console.log('discountTag', discountTag);

  // flag to see if either a discount or a staff tag is present
  const hasDiscount = discountTag || staffTag;
  console.log('hasDiscount', hasDiscount);

  if (!hasDiscount) {
    return EMPTY_DISCOUNT;
  }

  const isDoubleDiscount = input.shop.metafield?.value === 'true';
  console.log('isDoubleDiscount', isDoubleDiscount);

  // Check for efptwentyforall metafield - if true, use 20% discount for all
  const isTwentyForAll = input.shop.efptwentyforall?.value === 'true';
  console.log('isTwentyForAll', isTwentyForAll);

  let discountValue = discountTag; // Now correctly stores the highest discount

  // Check if the user is a test user
  //const userEmail = input.cart.buyerIdentity?.customer?.email;
  //const isTestUser = userEmail === "danny.smith@brewdog.com" || userEmail === "marissa@brewdog.com" || userEmail === "dannyemail123@yahoo.co.uk" || userEmail === "dannysytstream@gmail.com" || userEmail === "marissaurbank+15percent@gmail.com";

  // Apply new discount logic only for test users
  if (discountValue === 5 || discountValue === 10) {
    discountValue = 15;
  }

  const discount = staffTag
    ? 30
    : isTwentyForAll
      ? 20
      : isDoubleDiscount
        ? discountValue * 2
        : discountValue;

  // Check if customer is in Scotland (for MUP compliance)
  const ukRegion = (input.cart as any).attribute?.value;
  const isScotland = ukRegion === 'scotland';
  console.log('ukRegion', ukRegion);
  console.log('isScotland', isScotland);

  // Get MUP levy product variant ID to exclude it from discounts
  const levyProductId = (input.shop as any).mupLevyProduct?.value;
  console.log('levyProductId', levyProductId);

  const targets = input.cart.lines
    .filter((line) => !line.cost.compareAtAmountPerQuantity)
    // Remove any that have "Pfand" in the title
    .filter((line) => line.merchandise.__typename === "ProductVariant" && !line.merchandise.product.title.toLowerCase().includes("pfand"))
    .filter((line) => line.merchandise.__typename === "ProductVariant" && !line.merchandise.product.title.toLowerCase().includes("gift card"))
    // Exclude MUP levy product itself
    .filter((line) => {
      if (line.merchandise.__typename === "ProductVariant") {
        const variant = line.merchandise as { __typename: "ProductVariant"; id: string; product: { title: string; }; metafield?: { value: string } | null };
        if (levyProductId && variant.id === levyProductId) {
          console.log('Excluding MUP levy product from discount:', variant.product.title);
          return false;
        }
        return true;
      }
      return true;
    })
    // Exclude alcohol products if customer is in Scotland (for MUP compliance)
    .filter((line) => {
      if (line.merchandise.__typename === "ProductVariant") {
        const variant = line.merchandise as { __typename: "ProductVariant"; id: string; product: { title: string; }; metafield?: { value: string } | null };
        const hasAlcohol = variant.metafield?.value && parseFloat(variant.metafield.value) > 0;
        
        if (isScotland && hasAlcohol) {
          console.log('Excluding alcohol product from discount (Scotland + MUP):', variant.product.title);
          return false;
        }
        return true;
      }
      return true;
    })
    .map((line) => {
      console.log('line without compareAtAmountPerQuantity -- adding to targets', line);
      const merchandise = line.merchandise as { __typename: "ProductVariant"; id: string; product: { title: string; } };
      return {
        productVariant: {
          id: merchandise.id,
          quantity: line.quantity,
        },
      } as Target;
    });

  console.log('targets', targets);

  if (targets.length === 0) {
    return EMPTY_DISCOUNT;
  }

  return {
    discounts: [
      {
        targets: targets,
        value: {
          percentage: {
            value: `${discount}.0`
          }
        }
      }
    ],
    discountApplicationStrategy: DiscountApplicationStrategy.First
  };
};