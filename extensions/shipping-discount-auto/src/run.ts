import type {
  RunInput,
  FunctionRunResult,
  Target
} from "../generated/api";
import {
  DiscountApplicationStrategy,
} from "../generated/api";

const EMPTY_DISCOUNT: FunctionRunResult = {
  discountApplicationStrategy: DiscountApplicationStrategy.All,
  discounts: [],
};

export function run(input: RunInput): FunctionRunResult {
  console.log('Shipping Discount Auto Function started');

  let discountAmount = 0;
  const targets: Target[] = [];

  // Look through cart lines for products with shipping discount tags
  for (const line of input.cart.lines) {
    if (line.merchandise.__typename !== "ProductVariant") {
      continue;
    }

    const product = line.merchandise.product;
    
    console.log(`Checking product: ${product.title}`);
    console.log(`Product hasTags:`, product.hasTags);

    // Look for shipping-discount tags on this product
    const shippingDiscountTags = product.hasTags
      ?.filter((tagResponse: any) => tagResponse.hasTag && tagResponse.tag.startsWith('shipping-discount-'))
      .map((tagResponse: any) => tagResponse.tag) || [];
    
    if (shippingDiscountTags.length > 0) {
      console.log(`Found shipping discount tags on ${product.title}:`, shippingDiscountTags);
      
      // Parse discount amounts and find the highest one
      const amounts = shippingDiscountTags.map((tag: string) => {
        const amountStr = tag.replace('shipping-discount-', '');
        const amount = parseFloat(amountStr);
        console.log(`Parsed tag "${tag}" to amount: ${amount}`);
        return amount;
      }).filter((amount: number) => !isNaN(amount) && amount > 0);

      if (amounts.length > 0) {
        const tagDiscountAmount = Math.max(...amounts);
        console.log(`Product discount amount: ${tagDiscountAmount}`);
        
        // Use the highest discount amount found across all products
        discountAmount = Math.max(discountAmount, tagDiscountAmount);
        
        // Add this line to targets
        targets.push({
          cartLine: {
            id: line.id,
            quantity: line.quantity,
          },
        } as Target);
        
        console.log(`Added line to targets: ${product.title} (${line.id})`);
      }
    }
  }

  console.log(`Final discount amount: ${discountAmount}`);
  console.log(`Total targets: ${targets.length}`);

  if (targets.length === 0 || discountAmount === 0) {
    console.log('No valid discount found, returning empty discount');
    return EMPTY_DISCOUNT;
  }

  console.log(`Applying $${discountAmount} fixed discount to ${targets.length} items with shipping discount tags`);

  return {
    discounts: [
      {
        targets: targets,
        value: {
          fixedAmount: {
            amount: discountAmount.toFixed(2),
            appliesToEachItem: false
          }
        }
      }
    ],
    discountApplicationStrategy: DiscountApplicationStrategy.All
  };
};