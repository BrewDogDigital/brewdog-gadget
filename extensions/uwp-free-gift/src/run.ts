import type {
  RunInput,
  FunctionRunResult,
  Target
} from "../generated/api";
import {
  DiscountApplicationStrategy,
} from "../generated/api";


// Use JSDoc annotations for type safety
/**
 * @typedef {import("../generated/api").RunInput} RunInput
 * @typedef {import("../generated/api").FunctionRunResult} FunctionRunResult
 * @typedef {import("../generated/api").Target} Target
 */

/**
 * @type {FunctionRunResult}
 */
const EMPTY_DISCOUNT = {
  discountApplicationStrategy: DiscountApplicationStrategy.First,
  discounts: [],
};

// The configured entrypoint for the 'purchase.product-discount.run' extension target
/**
 * @param {RunInput} input
 * @returns {FunctionRunResult}
 */
export function run(input: RunInput): FunctionRunResult {
  // Log the entire cart object for debugging
  console.log("Cart object:", JSON.stringify(input.cart, null, 2));

  const targets = input.cart.lines
    .filter(line => {
      console.error("Checking line item:", line); // Log each line item
      return line.attributes.some(attr => attr.key === 'free_gift' && attr.value === 'true');
    })
    .map(line => {
      console.log("Applying discount to line item:", line.id); // Log the line item getting the discount
      return /** @type {Target} */ ({
        // Use the cart line ID to create a discount target
        cartLine: {
          id: line.id
        }
      });
    });

  if (!targets.length) {
    // Log when no lines qualify for the discount
    console.error("No cart lines qualify for free gift discount.");
    return EMPTY_DISCOUNT;
  }    console.error("No cart lines qualify for free gift discount.");    console.error("No cart lines qualify for free gift discount.");

  // Log the discount application result
  console.error("Discounts to apply:", targets);

  // The @shopify/shopify_function package applies JSON.stringify() to your function result
  // and writes it to STDOUT
  return {
    discounts: [
      {
        // Apply the discount to the collected targets
        
        targets,
        // Define a fixed amount discount (100% off)
        value: {
          fixedAmount: {
            amount: "0.0", // This effectively makes the item free
            appliesToEachItem: true
          }
        }
      }
    ],
    discountApplicationStrategy: DiscountApplicationStrategy.First
  };
};
