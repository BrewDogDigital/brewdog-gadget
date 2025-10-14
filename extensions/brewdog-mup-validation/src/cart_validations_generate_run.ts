import type {
  CartValidationsGenerateRunInput,
  CartValidationsGenerateRunResult,
  ValidationError,
} from "../generated/api";

/**
 * MUP Validation Function
 * 
 * This function ensures MUP compliance even when discounts are applied.
 * Since validation runs BEFORE cart transforms, we validate the product
 * prices directly against the MUP floor.
 * 
 * Flow:
 * 1. Customer adds product to cart
 * 2. Customer applies discount → Product price drops
 * 3. Validation checks if discounted price < MUP floor
 * 4. If price < MUP floor → Block checkout with error
 */
export function cartValidationsGenerateRun(input: CartValidationsGenerateRunInput): CartValidationsGenerateRunResult {
  console.log("🔒 MUP Validation Function CALLED");
  console.log("📊 Cart lines count:", input.cart.lines.length);

  const errors: ValidationError[] = [];

  // Check if customer is in Scotland
  const ukRegionAttribute = (input.cart as any).attribute;
  const ukRegion = ukRegionAttribute?.value;
  
  console.log("🌍 UK Region:", ukRegion);
  
  if (ukRegion !== "scotland") {
    console.log("⏭️ Customer not in Scotland, skipping MUP validation");
    return { operations: [{ validationAdd: { errors: [] } }] };
  }

  console.log("🏴󠁧󠁢󠁳󠁣󠁴󠁿 Customer is in Scotland - validating MUP compliance");
  
  // Get minimum unit price from shop
  const minimumUnitPrice = parseFloat((input.shop as any)?.minimumUnitPrice?.value || "0.65");
  console.log("💰 Minimum unit price:", minimumUnitPrice);

  // Check each product line to see if discounted price would violate MUP
  input.cart.lines.forEach(line => {
    // Get units from product metafield
    const variant = line.merchandise;
    if (variant.__typename !== "ProductVariant") return;
    
    const unitsPerItem = parseFloat((variant as any).metafield?.value || "0");
    if (unitsPerItem <= 0) {
      console.log("  ⏭️ Line has no alcohol units, skipping");
      return;
    }

    console.log("🔍 Checking product line:", line.id);
    console.log("  - Units per item:", unitsPerItem);
    
    // Get the DISCOUNTED price per item (totalAmount / quantity)
    const totalAmount = parseFloat(line.cost.totalAmount.amount);
    const quantity = line.quantity;
    const currentPricePerItem = totalAmount / quantity;
    
    console.log("  - Total amount:", totalAmount);
    console.log("  - Quantity:", quantity);
    console.log("  - Current price per item (after discount):", currentPricePerItem);
    
    // Calculate MUP floor
    const mupFloor = unitsPerItem * minimumUnitPrice;
    console.log("  - MUP floor:", mupFloor);
    
    // If current price is below MUP floor, block checkout
    if (currentPricePerItem < mupFloor) {
      const shortfall = mupFloor - currentPricePerItem;
      console.log("  ❌ PRICE BELOW MUP FLOOR!");
      console.log("     Shortfall:", shortfall.toFixed(2));
      
      errors.push({
        message: `Discounts cannot reduce the price below the Minimum Unit Pricing requirement. Current price: £${currentPricePerItem.toFixed(2)}, Minimum required: £${mupFloor.toFixed(2)}. Please remove or reduce your discount code.`,
        target: "$.cart",
      });
    } else {
      console.log("  ✅ Price meets MUP requirements");
    }
  });

  if (errors.length > 0) {
    console.log("🚫 Validation FAILED - price below MUP floor");
  } else {
    console.log("✅ Validation PASSED - MUP compliance maintained");
  }

  return {
    operations: [{
      validationAdd: {
        errors
      }
    }]
  };
};

