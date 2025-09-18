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

  const discountTag = tags.find((tag) => tag.startsWith('efp-discount-'));
  const staffTag = tags.find((tag) => tag.startsWith('staff'));
  console.log('staffTag', staffTag);
  console.log('discountTag', discountTag);

  // flag to see if either a discount or a staff tag is present
  const hasDiscount = discountTag || staffTag;
  console.log('hasDiscount', hasDiscount);

  if (!hasDiscount) {
    return EMPTY_DISCOUNT;
  }

  const isDoubleDiscount = "false";
  console.log('isDoubleDiscount', isDoubleDiscount);

  let discountValue = Number(discountTag?.replace('efp-discount-', ''));

  // Check if the user is a test user
  const userEmail = input.cart.buyerIdentity?.customer?.email;
  const isTestUser = userEmail === "danny.smith@brewdog.com" || userEmail === "marissa@brewdog.com" || userEmail === "dannyemail123@yahoo.co.uk";

  // Apply new discount logic only for test users
  if (isTestUser && (discountValue === 5 || discountValue === 10)) {
    discountValue = 15;
  }

  const discount = staffTag
    ? 30
    : isDoubleDiscount
      ? discountValue * 2
      : discountValue;

  const targets = input.cart.lines
    .filter((line) => !line.cost.compareAtAmountPerQuantity)
    // Remove any that have "Pfand" in the title
    .filter((line) => line.merchandise.__typename === "ProductVariant" && !line.merchandise.product.title.toLowerCase().includes("pfand"))
    .filter((line) => line.merchandise.__typename === "ProductVariant" && !line.merchandise.product.title.toLowerCase().includes("gift card"))
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
            value: `100.0`
          }
        }
      }
    ],
    discountApplicationStrategy: DiscountApplicationStrategy.First
  };
};