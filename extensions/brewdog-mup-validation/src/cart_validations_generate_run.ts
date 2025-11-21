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
 * Scottish postcodes start with: AB, DD, DG, EH, FK, HS, IV, KA, KW, KY, ML, PA, PH, TD, ZE
 * Glasgow postcodes: G1-G9 (NOT GL=Gloucester, GU=Guildford, GY=Guernsey)
 */
function isScottishPostcode(postcode: string | null | undefined): boolean {
  if (!postcode) {
    console.log("   [isScottishPostcode] Postcode is null/undefined");
    return false;
  }
  
  const normalized = postcode.trim().toUpperCase().replace(/\s+/g, '');
  console.log(`   [isScottishPostcode] Original: "${postcode}", Normalized: "${normalized}"`);
  
  // Scottish postcode prefixes (excluding G to handle Glasgow separately)
  const scottishPrefixes = [
    'AB', 'DD', 'DG', 'EH', 'FK',
    'HS', 'IV', 'KA', 'KW', 'KY', 'ML', 
    'PA', 'PH', 'TD', 'ZE'
  ];
  
  // Check standard prefixes
  if (scottishPrefixes.some(prefix => normalized.startsWith(prefix))) {
    console.log(`   [isScottishPostcode] Matched standard Scottish prefix`);
    return true;
  }
  
  // Special handling for Glasgow (G1-G9) - exclude Gloucester (GL), Guildford (GU), and Guernsey (GY)
  // Glasgow postcodes: G followed by a digit (G1, G2, G3, etc.)
  if (normalized.startsWith('G') && !normalized.startsWith('GU') && !normalized.startsWith('GL') && !normalized.startsWith('GY')) {
    // Check if second character is a digit (G1-G9 are Glasgow)
    const secondChar = normalized.charAt(1);
    if (secondChar && /[0-9]/.test(secondChar)) {
      console.log(`   [isScottishPostcode] Matched Glasgow postcode (G + digit)`);
      return true;
    }
  }
  
  console.log(`   [isScottishPostcode] No match - not Scottish`);
  return false;
}
export function cartValidationsGenerateRun(input: CartValidationsGenerateRunInput): CartValidationsGenerateRunResult {
  console.log("🔒 MUP Validation Function CALLED");
  console.log("📊 Cart lines count:", input.cart.lines.length);
  console.log("📊 Full cart input:", JSON.stringify(input.cart, null, 2));

  const errors: ValidationError[] = [];

  // Skip validation if cart is empty
  if (!input.cart.lines || input.cart.lines.length === 0) {
    console.log("⏭️ Cart is empty - skipping validation");
    return { operations: [{ validationAdd: { errors: [] } }] };
  }

  // Check for MUP override attribute (set by frontend when override discount code is detected)
  const overrideAttribute = (input.cart as any).overrideAttribute;
  const hasOverride = overrideAttribute?.value === 'true';
  
  console.log("🔍 MUP Override check:");
  console.log("  - Override attribute object:", overrideAttribute);
  console.log("  - Has override:", hasOverride);
  
  if (hasOverride) {
    console.log("⚠️ MUP enforcement BYPASSED due to override cart attribute");
    return { operations: [{ validationAdd: { errors: [] } }] };
  }

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
      console.log("SCOTTISH DELIVERY ADDRESS DETECTED but region is not Scotland!");
      console.log("   Postcode:", detectedPostcode);
      
      // Use $.cart as target for better visibility
      errors.push({
        message: `Scottish address detected (${detectedPostcode}). Please return to your cart and select "Scotland" as your region to ensure correct pricing and MUP compliance before completing your order.`,
        target: "$.cart",
      });
      
      console.log("Returning validation error to block checkout");
      console.log("Target: $.cart");
      
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

  console.log("🏴󠁧󠁢󠁳󠁣󠁴󠁿 Customer is in Scotland - validating MUP compliance");
  
  // Get minimum unit price from shop
  const minimumUnitPrice = parseFloat((input.shop as any)?.minimumUnitPrice?.value || "0.65");
  console.log("💰 Minimum unit price:", minimumUnitPrice);

  // Check if cart has any alcoholic products
  let hasAlcoholicProducts = false;
  for (const line of input.cart.lines) {
    const variant = line.merchandise;
    if (variant.__typename === "ProductVariant") {
      const unitsPerItem = parseFloat((variant as any).metafield?.value || "0");
      if (unitsPerItem > 0) {
        hasAlcoholicProducts = true;
        break;
      }
    }
  }

  if (!hasAlcoholicProducts) {
    console.log("⏭️ Cart has no alcoholic products - skipping MUP validation");
    return { operations: [{ validationAdd: { errors: [] } }] };
  }

  console.log("🍺 Cart contains alcoholic products - proceeding with MUP validation");

  // Check each product line to see if price would violate MUP
  // NOTE: Gift cards are payment methods and DON'T reduce line item prices during validation.
  //       Only discount codes reduce prices here, so this naturally blocks only discount violations.
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
    
    // Get the current price per item (should include ALL discounts: codes, automatic, etc.)
    // NOTE: Shopify amounts are in decimal format (pounds), not cents
    // IMPORTANT: amountPerQuantity may not reflect discounts, so calculate from totalAmount
    const totalAmount = parseFloat((line.cost as any).totalAmount.amount);
    const amountPerQuantity = parseFloat((line.cost as any).amountPerQuantity.amount);
    const quantity = line.quantity;
    
    // Calculate price per item from total (this reflects ALL discounts)
    // If total is 0, price per item is 0 (100% discount)
    const pricePerItem = quantity > 0 ? totalAmount / quantity : amountPerQuantity;
    
    // Calculate base price (without discounts) to detect if discounts are applied
    const basePricePerItem = amountPerQuantity;
    const hasDiscount = totalAmount < (basePricePerItem * quantity);
    
    console.log("  - Total amount for line:", totalAmount);
    console.log("  - Amount per quantity (base price):", amountPerQuantity);
    console.log("  - Quantity:", quantity);
    console.log("  - Calculated price per item (from total/quantity):", pricePerItem);
    console.log("  - Base price per item:", basePricePerItem);
    console.log("  - Has discount applied:", hasDiscount);
    console.log("  ℹ️  NOTE: Using totalAmount/quantity to ensure discounts are included");
    
    // Calculate MUP floor (in pounds)
    const mupFloor = unitsPerItem * minimumUnitPrice;
    console.log("  - MUP floor (pounds):", mupFloor);
    console.log("  - Current price per item:", pricePerItem);
    
    // Only block if discounts are applied AND price is below MUP floor
    // If no discount is applied and price is below MUP floor, let it pass so cart transform can add levy
    if (pricePerItem < 0) {
      console.log("  ❌ PRICE IS NEGATIVE - invalid state!");
      errors.push({
        message: `Invalid pricing detected. Please refresh and try again.`,
        target: "$.checkout",
      });
    } else if (hasDiscount && pricePerItem < mupFloor) {
      console.log("  ❌ PRICE BELOW MUP FLOOR - discount violates MUP!");
      console.log("     Current price: £" + pricePerItem.toFixed(2));
      console.log("     Required minimum: £" + mupFloor.toFixed(2));
      console.log("     Shortfall: £" + (mupFloor - pricePerItem).toFixed(2));
      
      errors.push({
        message: `Discounts cannot reduce the price below the Minimum Unit Pricing requirement. Current price: £${pricePerItem.toFixed(2)}, Minimum required: £${mupFloor.toFixed(2)}. Please remove or adjust your discounts.`,
        target: "$.checkout",
      });
    } else if (!hasDiscount && pricePerItem < mupFloor) {
      console.log("  ⚠️  Price below MUP floor but no discount applied - allowing cart transform to add levy");
      console.log("     Current price: £" + pricePerItem.toFixed(2));
      console.log("     Required minimum: £" + mupFloor.toFixed(2));
      console.log("     Cart transform will add levy to meet MUP requirements");
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

