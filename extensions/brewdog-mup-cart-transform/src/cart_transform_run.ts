import type {
  CartTransformRunInput,
  CartTransformRunResult,
  CartLine,
  ProductVariant,
  Metafield,
} from "../generated/api";

const NO_CHANGES: CartTransformRunResult = {
  operations: [],
};

/**
 * Get MUP levy variant ID from shop metafields array
 * The metafield contains the variant ID as a string
 */
function getLevyVariantId(shopMetafields: Metafield[]): string | null {
  console.log("🔍 Looking for MUP levy product metafield...");

  const levyProductMetafield = shopMetafields.find(
    (mf: any) => mf.namespace === 'custom' && mf.key === 'mup_levy_product'
  );

  if (!levyProductMetafield?.value) {
    console.log("❌ No levy product metafield found");
    return null;
  }

  const variantId = levyProductMetafield.value.trim();
  console.log("✅ Levy variant ID found:", variantId);
  return variantId;
}

/**
 * Calculate units per item from product metafields
 */
function calculateUnitsPerItem(unitsMetafield?: Metafield | null): number {
  console.log("🔍 Checking product for alcohol units metafield...");

  // Try direct total_units first
  if (unitsMetafield?.value) {
    const units = parseFloat(unitsMetafield.value);
    console.log("✅ Found total_units metafield with value:", units);
    return units;
  }

  console.log("❌ No total_units metafield found on product");
  // For now, return 0 if no units metafield - you can extend this later
  // to handle ABV × volume calculation if needed
  return 0;
}

/**
 * Get minimum unit price from shop metafields array
 */
function getMinimumUnitPrice(shopMetafields: Metafield[]): number {
  console.log("🔍 Looking for minimum unit price metafield...");

  const minimumUnitPriceMetafield = shopMetafields.find(
    (mf: any) => mf.namespace === 'custom' && mf.key === 'minimum_unit_price'
  );

  if (minimumUnitPriceMetafield?.value) {
    const price = parseFloat(minimumUnitPriceMetafield.value);
    console.log("✅ Found minimum unit price metafield with value:", price);
    return price;
  }

  console.log("❌ No minimum unit price metafield found, using default: 0.65");
  return 0.65; // Default to £0.65
}

/**
 * Get debug flag from shop metafields array
 */
function getDebugEnabled(shopMetafields: Metafield[]): boolean {
  const debugMetafield = shopMetafields.find(
    (mf: any) => mf.namespace === 'custom' && mf.key === 'mup_debug'
  );
  return debugMetafield?.value === 'true' || debugMetafield?.value === '1';
}

/**
 * Round up to nearest penny (ceiling to 2 decimal places)
 */
function roundUpToPenny(amount: number): number {
  return Math.ceil(amount * 100) / 100;
}

/**
 * Check if a cart line needs MUP levy
 */
function needsMupLevy(
  line: CartLine,
  minimumUnitPrice: number,
  unitsPerItem: number
): boolean {
  if (unitsPerItem <= 0) {
    console.log("⏭️ Units per item is 0 or negative, no MUP check needed");
    return false;
  }

  const currentPricePerUnit = parseFloat(line.cost.amountPerQuantity.amount);
  const mupFloor = unitsPerItem * minimumUnitPrice;

  console.log("🔍 MUP check:", {
    currentPricePerUnit: currentPricePerUnit,
    mupFloor: mupFloor,
    needsLevy: currentPricePerUnit < mupFloor
  });

  return currentPricePerUnit < mupFloor;
}

/**
 * Calculate levy amount per unit needed
 */
function calculateLevyPerUnit(
  line: CartLine,
  minimumUnitPrice: number,
  unitsPerItem: number
): number {
  const currentPricePerUnit = parseFloat(line.cost.amountPerQuantity.amount);
  const mupFloor = unitsPerItem * minimumUnitPrice;

  console.log("💡 Calculating levy needed:");
  console.log("  - Current price per unit:", currentPricePerUnit);
  console.log("  - MUP floor:", mupFloor);

  if (currentPricePerUnit >= mupFloor) {
    console.log("✅ Product already meets MUP, no levy needed");
    return 0;
  }

  const levyAmount = roundUpToPenny(mupFloor - currentPricePerUnit);
  console.log("💰 Levy per unit calculated:", levyAmount, "(rounded up to nearest penny)");

  return levyAmount;
}

/**
 * Create levy child line operation
 */
function createLevyOperation(
  parentLine: CartLine,
  levyPerUnit: number,
  quantity: number,
  levyVariantId: string,
  debugEnabled: boolean,
  debugData?: {
    currentPricePerUnit: number;
    mupFloor: number;
    unitsPerItem: number;
    minimumUnitPrice: number;
  }
): any {
  console.log("🏗️ Creating levy operation:");
  console.log("  - Parent line ID:", parentLine.id);
  console.log("  - Levy per unit:", levyPerUnit);
  console.log("  - Quantity:", quantity);
  console.log("  - Levy variant ID:", levyVariantId);

  // Ensure variant ID is a full GID
  const fullVariantId = levyVariantId.startsWith('gid://') 
    ? levyVariantId 
    : `gid://shopify/ProductVariant/${levyVariantId}`;

  console.log("  - Full variant GID:", fullVariantId);

  const operation = {
    expand: {
      cartLineId: parentLine.id,
      expandedCartItems: [
        {
          merchandiseId: fullVariantId,
          quantity,
          price: {
            adjustment: {
              fixedPricePerUnit: {
                amount: levyPerUnit.toString(),
              },
            },
          },
          attributes: [
            {
              key: "mup",
              value: "true",
            },
            {
              key: "parent_line_id",
              value: parentLine.id,
            },
            // Optional debug attributes for live inspection
            ...(debugEnabled && debugData ? [
              { key: "mup_debug", value: "true" },
              { key: "mup_total_units", value: debugData.unitsPerItem.toString() },
              { key: "mup_minimum_unit_price", value: debugData.minimumUnitPrice.toString() },
              { key: "mup_current_price_per_unit", value: debugData.currentPricePerUnit.toString() },
              { key: "mup_floor", value: debugData.mupFloor.toString() },
              { key: "mup_levy_per_unit", value: levyPerUnit.toString() },
              { key: "mup_levy_variant_id", value: fullVariantId },
            ] : []),
          ],
        },
      ],
    },
  };

  console.log("✅ Levy operation created successfully");
  return operation;
}

export function cartTransformRun(input: CartTransformRunInput): CartTransformRunResult {
  console.log("🚀 Cart Transform Function CALLED!");
  console.log("🔍 Input received:", {
    cartLinesCount: input.cart?.lines?.length ?? 0,
  });

  // Check if customer is in Scotland via cart attribute
  const ukRegionAttribute = (input.cart as any).attribute;
  const ukRegion = ukRegionAttribute?.value;
  
  console.log("🌍 UK Region from cart attribute:", ukRegion);

  // Only apply MUP if customer is in Scotland
  if (ukRegion !== "scotland") {
    console.log("⏭️ Customer not in Scotland (uk_region: " + (ukRegion || "not set") + "), skipping MUP");
    console.log("🏁 Cart Transform Function completed - NO CHANGES (not Scotland)");
    return NO_CHANGES;
  }

  console.log("🏴󠁧󠁢󠁳󠁣󠁴󠁿 Customer is in Scotland - checking if MUP enforcement is enabled");

  // Check if MUP enforcement is enabled
  const enforcementEnabled = (input.shop as any)?.enforcementEnabled?.value;
  console.log("⚙️ MUP enforcement enabled:", enforcementEnabled);
  
  if (enforcementEnabled === 'false') {
    console.log("⏭️ MUP enforcement is disabled in settings");
    console.log("🏁 Cart Transform Function completed - NO CHANGES (enforcement disabled)");
    return NO_CHANGES;
  }

  console.log("✅ MUP enforcement is enabled - applying MUP logic");

  const operations: any[] = [];

  // Assemble MUP configuration from shop metafields (aliased in query)
  const shop = input.shop;
  const shopMetafields: any[] = [];
  
  if (shop?.levyProduct) {
    shopMetafields.push({
      namespace: 'custom',
      key: 'mup_levy_product',
      value: shop.levyProduct.value ?? '',
      type: shop.levyProduct.type ?? '',
    });
  }
  if (shop?.minimumUnitPrice) {
    shopMetafields.push({
      namespace: 'custom',
      key: 'minimum_unit_price',
      value: shop.minimumUnitPrice.value ?? '',
      type: shop.minimumUnitPrice.type ?? '',
    });
  }
  if (shop?.debugFlag) {
    shopMetafields.push({
      namespace: 'custom',
      key: 'mup_debug',
      value: shop.debugFlag.value ?? '',
      type: shop.debugFlag.type ?? '',
    });
  }

  console.log("🏪 Shop metafields assembled:", shopMetafields.length);
  console.log("🏪 Shop metafields:", shopMetafields.map((mf: any) => ({
    key: mf.key,
    value: mf.value,
    type: mf.type,
    namespace: mf.namespace
  })));

  const minimumUnitPrice = getMinimumUnitPrice(shopMetafields);
  const levyVariantId = getLevyVariantId(shopMetafields);
  const debugEnabled = getDebugEnabled(shopMetafields);

  console.log("💰 Minimum unit price:", minimumUnitPrice);
  console.log("🏷️ Levy variant ID:", levyVariantId ? "configured" : "NOT configured");

  if (!levyVariantId) {
    console.warn("❌ MUP levy product not configured in custom.mup_levy_product metafield");
    console.warn("💡 Please configure the MUP settings in the app admin panel");
    console.log("🏁 Cart Transform Function completed - NO CHANGES");
    return NO_CHANGES;
  }

  console.log("✅ Levy variant configured, processing cart lines...");

  const fullVariantId = levyVariantId.startsWith('gid://') 
    ? levyVariantId 
    : `gid://shopify/ProductVariant/${levyVariantId}`;

  // First, find all MUP levy lines and adjust their prices based on their parent lines
  const levyLines: Array<{ line: CartLine; parentLineId: string }> = [];
  const parentLines: Map<string, CartLine> = new Map();

  // Map variant IDs to cart lines for parent lookup
  const variantToLineMap: Map<string, CartLine> = new Map();
  
  // Separate levy lines from parent lines
  for (let i = 0; i < input.cart.lines.length; i++) {
    const line = input.cart.lines[i];
    
    // Check if this is a MUP levy line using aliased attribute fields
    const lineWithAttrs = line as any;
    const mupAttribute = lineWithAttrs.mupAttribute;
    const parentLineIdAttr = lineWithAttrs.parentLineIdAttribute;
    
    console.log(`🔍 Line ${i + 1}: Checking attributes`, {
      lineId: line.id,
      mupAttribute: mupAttribute?.value,
      parentLineIdAttribute: parentLineIdAttr?.value,
      merchandiseType: line.merchandise.__typename
    });
    
    if (mupAttribute?.value === 'true' && parentLineIdAttr?.value) {
      console.log(`✅ Found MUP levy line: ${line.id}, parent variant: ${parentLineIdAttr.value}`);
      levyLines.push({
        line: line as CartLine,
        parentLineId: parentLineIdAttr.value,
      });
    } else if (line.merchandise.__typename === "ProductVariant") {
      const productVariant = line.merchandise as ProductVariant;
      // Extract numeric variant ID from GID
      const variantId = productVariant.id.split('/').pop() || '';
      
      console.log(`📦 Storing parent line: ${line.id}, variant: ${variantId}`);
      parentLines.set(line.id, line as CartLine);
      variantToLineMap.set(variantId, line as CartLine);
    }
  }
  
  console.log(`📊 Found ${levyLines.length} levy lines and ${parentLines.size} parent lines`);

  // Process levy lines and adjust their prices based on parent
  console.log(`🔄 Processing ${levyLines.length} levy lines...`);
  for (const { line: levyLine, parentLineId } of levyLines) {
    console.log(`🔍 Processing levy line ${levyLine.id}, looking for parent variant ${parentLineId}`);
    console.log(`📋 Available variant IDs:`, Array.from(variantToLineMap.keys()));
    
    // Look up parent line by variant ID
    const parentLine = variantToLineMap.get(parentLineId);
    
    if (!parentLine) {
      console.log(`⚠️ Parent line with variant ${parentLineId} not found for levy line ${levyLine.id}`);
      console.log(`⚠️ This levy line will not have its price adjusted`);
      continue;
    }
    
    console.log(`✅ Found parent line for variant ${parentLineId}: ${parentLine.id}`);

    const productVariant = parentLine.merchandise as ProductVariant;
    const unitsPerItem = calculateUnitsPerItem(productVariant.metafield);
    
    if (unitsPerItem <= 0) {
      console.log(`⏭️ Parent line ${parentLineId} has no alcohol units, removing levy`);
      continue;
    }

    const currentPricePerItem = parseFloat(parentLine.cost.amountPerQuantity.amount);
    const mupFloorPerItem = unitsPerItem * minimumUnitPrice;

    if (currentPricePerItem < mupFloorPerItem) {
      const levyPerItem = mupFloorPerItem - currentPricePerItem;
      const roundedLevyPerItem = roundUpToPenny(levyPerItem);
      
      console.log(`💰 Adjusting levy price for line ${levyLine.id}:`, {
        parentPrice: currentPricePerItem,
        mupFloor: mupFloorPerItem,
        levyPerItem: roundedLevyPerItem,
      });

      // Update the levy line price
      const operation = {
        update: {
          cartLineId: levyLine.id,
          price: {
            adjustment: {
              fixedPricePerUnit: {
                amount: roundedLevyPerItem.toString(),
              },
            },
          },
        },
      };

      operations.push(operation);
    } else {
      console.log(`✅ Parent line ${parentLineId} now meets MUP, levy should be removed`);
      // Note: We can't remove lines from cart transform, but the price can be set to 0
      const operation = {
        update: {
          cartLineId: levyLine.id,
          price: {
            adjustment: {
              fixedPricePerUnit: {
                amount: "0.00",
              },
            },
          },
        },
      };
      operations.push(operation);
    }
  }

  // Now process parent lines that don't have levy lines yet
  for (let i = 0; i < input.cart.lines.length; i++) {
    const line = input.cart.lines[i];
    console.log(`📦 Processing line ${i + 1}/${input.cart.lines.length}:`, {
      id: line.id,
      quantity: line.quantity,
      merchandiseType: line.merchandise.__typename
    });

    // Only process product variant lines
    if (line.merchandise.__typename !== "ProductVariant") {
      console.log("⏭️ Skipping non-product variant line");
      continue;
    }

    // Skip if this line is already a MUP levy (check aliased attribute)
    const lineWithAttrs = line as any;
    const mupAttribute = lineWithAttrs.mupAttribute;
    if (mupAttribute?.value === 'true') {
      console.log("⏭️ Skipping existing MUP levy line");
      continue;
    }

    // Check if this line already has a levy line
    const hasLevyLine = levyLines.some(({ parentLineId }) => parentLineId === line.id);
    if (hasLevyLine) {
      console.log("⏭️ Line already has a levy line, skipping");
      continue;
    }

    const productVariant = line.merchandise as ProductVariant;
    console.log("🧮 Product variant ID:", productVariant.id);

    const originalPricePerItem = parseFloat(line.cost.amountPerQuantity.amount);
    console.log("💵 Original price per item:", originalPricePerItem);

    const unitsPerItem = calculateUnitsPerItem(productVariant.metafield);
    console.log("📊 Units per item:", unitsPerItem);

    if (unitsPerItem <= 0) {
      console.log("⏭️ Skipping product with no alcohol units");
      continue;
    }

    const mupFloorPerItem = unitsPerItem * minimumUnitPrice;

    console.log("💸 Original price per item:", originalPricePerItem);
    console.log("📏 MUP floor per item:", mupFloorPerItem);

    // Check if MUP levy is needed for this line (based on original price)
    if (originalPricePerItem < mupFloorPerItem) {
      const levyPerItem = mupFloorPerItem - originalPricePerItem;
      const roundedLevyPerItem = roundUpToPenny(levyPerItem);
      
      console.log("⚡ Levy needed per item:", levyPerItem);
      console.log("💰 Rounded levy per item:", roundedLevyPerItem);
      console.log("🔢 Line quantity:", line.quantity);
      console.log("📌 Note: Levy variant should be added as separate cart item (not via expand)");

      // Note: Cart transforms can't add new lines, so we can't add the levy here
      // The levy should be added via the shopifyCartLineItem create action or a webhook
      // For now, we'll log that a levy is needed
      console.log("⚠️ Cart transform cannot add new lines. Levy should be added via create action or webhook.");
    } else {
      console.log("✅ Product meets MUP requirements, no levy needed");
    }
  }

  console.log("🎯 Final operations count:", operations.length);
  console.log("🏁 Cart Transform Function completed");

  return {
    operations,
  };
};