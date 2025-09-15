import type {
  RunInput,
  FunctionRunResult,
} from "../generated/api";

export function run(input: RunInput): FunctionRunResult {
  console.log('Advent Shipping Function started');

  const cart = input.cart;
  const deliveryGroups = cart.deliveryGroups;

  // Check if there are at least 2 items in cart (one with advent-shipping tag, one other)
  if (cart.lines.length < 2) {
    console.log('Cart has less than 2 items, no shipping discount');
    return { discounts: [] };
  }

  let hasAdventShippingProduct = false;
  let hasOtherProduct = false;

  // Check cart lines for advent-shipping tag and other products
  for (const line of cart.lines) {
    if (line.merchandise.__typename !== "ProductVariant") {
      continue;
    }

    const product = line.merchandise.product;
    console.log(`Checking product: ${product.title}`);

    // Check if this product has the advent-shipping tag
    const hasAdventTag = product.hasTags?.some(
      (tagResponse: any) => tagResponse.hasTag && tagResponse.tag === 'advent-shipping'
    ) || false;

    if (hasAdventTag) {
      hasAdventShippingProduct = true;
      console.log(`Found advent-shipping product: ${product.title}`);
    } else {
      hasOtherProduct = true;
      console.log(`Found other product: ${product.title}`);
    }
  }

  console.log(`Has advent shipping product: ${hasAdventShippingProduct}`);
  console.log(`Has other product: ${hasOtherProduct}`);

  // Only apply free shipping if both conditions are met
  if (!hasAdventShippingProduct || !hasOtherProduct) {
    console.log('Conditions not met for free shipping');
    return { discounts: [] };
  }

  console.log('Conditions met - applying free shipping');

  // Apply 100% shipping discount (free shipping)
  console.log('Applying 100% shipping discount');

  return {
    discounts: [{
      targets: [{
        orderSubtotal: {
          excludedVariantIds: []
        }
      }],
      value: {
        percentage: {
          value: 100.0
        }
      },
      message: "Free shipping with advent calendar"
    }]
  };
}
