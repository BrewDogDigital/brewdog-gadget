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

/**
 * Check if a postcode is Scottish
 * Scottish postcodes start with: AB, DD, DG, EH, FK, G, HS, IV, KA, KW, KY, ML, PA, PH, TD, ZE
 */
function isScottishPostcode(postcode: string | null | undefined): boolean {
  if (!postcode) {
    console.log("   [isScottishPostcode] Postcode is null/undefined");
    return false;
  }
  
  const normalized = postcode.trim().toUpperCase().replace(/\s+/g, '');
  console.log(`   [isScottishPostcode] Original: "${postcode}", Normalized: "${normalized}"`);
  
  const scottishPrefixes = [
    'AB', 'DD', 'DG', 'EH', 'FK', 'G', 
    'HS', 'IV', 'KA', 'KW', 'KY', 'ML', 
    'PA', 'PH', 'TD', 'ZE'
  ];
  
  const isScottish = scottishPrefixes.some(prefix => normalized.startsWith(prefix));
  console.log(`   [isScottishPostcode] Match result: ${isScottish}`);
  
  return isScottish;
}
export function cartValidationsGenerateRun(input: CartValidationsGenerateRunInput): CartValidationsGenerateRunResult {
  console.log("🔒 MUP Validation Function CALLED");
  console.log("📊 Cart lines count:", input.cart.lines.length);

  const errors: ValidationError[] = [];

  // Check if customer is in Scotland
  const ukRegionAttribute = (input.cart as any).attribute;
  const ukRegion = ukRegionAttribute?.value;
  
  console.log("🌍 UK Region:", ukRegion);
  
  // Check for Scottish address mismatch (customer says they're not in Scotland but has Scottish address)
  if (ukRegion !== "scotland") {
    console.log("🔍 Checking for Scottish address when region is not Scotland...");
    console.log("🔍 Current uk_region value:", ukRegion);
    
    // Check delivery addresses
    const deliveryGroups = (input.cart as any).deliveryGroups || [];
    console.log("📦 Number of delivery groups:", deliveryGroups.length);
    
    let scottishPostcodeDetected = false;
    let detectedPostcode = "";
    
    for (let i = 0; i < deliveryGroups.length; i++) {
      const group = deliveryGroups[i];
      const deliveryAddress = group.deliveryAddress;
      
      console.log(`📍 Delivery Group ${i + 1}:`, {
        hasAddress: !!deliveryAddress,
        zip: deliveryAddress?.zip,
        city: deliveryAddress?.city,
        countryCode: deliveryAddress?.countryCode
      });
      
      if (deliveryAddress && deliveryAddress.zip) {
        const isScottish = isScottishPostcode(deliveryAddress.zip);
        console.log(`   🏴󠁧󠁢󠁳󠁣󠁴󠁿 Is Scottish postcode (${deliveryAddress.zip}):`, isScottish);
        
        if (isScottish) {
          scottishPostcodeDetected = true;
          detectedPostcode = deliveryAddress.zip;
          break;
        }
      }
    }
    
    if (scottishPostcodeDetected) {
      console.log("❌ SCOTTISH DELIVERY ADDRESS DETECTED but region is not Scotland!");
      console.log("   Postcode:", detectedPostcode);
      
      // Use $.cart as target for better visibility
      errors.push({
        message: `Scottish address detected (${detectedPostcode}). Please return to your cart and select "Scotland" as your region to ensure correct pricing and MUP compliance before completing your order.`,
        target: "$.cart",
      });
      
      console.log("🚫 Returning validation error to block checkout");
      console.log("🎯 Target: $.cart");
      
      return {
        operations: [{
          validationAdd: {
            errors
          }
        }]
      };
    }
    
    console.log("✅ No Scottish delivery address detected, skipping MUP validation");
    console.log("⚠️  NOTE: Billing address is NOT available in cart validation functions (Shopify API limitation)");
    console.log("⚠️  We can only check delivery/shipping addresses");
    return { operations: [{ validationAdd: { errors: [] } }] };
  }

  console.log("🏴󠁧󠁢󠁳󠁣󠁴󠁿 Customer is in Scotland - checking if MUP enforcement is enabled");
  
  // Check if MUP enforcement is enabled
  const enforcementEnabled = (input.shop as any)?.enforcementEnabled?.value;
  console.log("⚙️ MUP enforcement enabled:", enforcementEnabled);
  
  if (enforcementEnabled === 'false') {
    console.log("⏭️ MUP enforcement is disabled in settings");
    return { operations: [{ validationAdd: { errors: [] } }] };
  }

  console.log("✅ MUP enforcement is enabled - validating MUP compliance");
  
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
        target: "$.checkout",
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

