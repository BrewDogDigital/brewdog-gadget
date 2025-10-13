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
    mf => mf.namespace === 'custom' && mf.key === 'mup_levy_product'
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

  // Try direct units_per_item first
  if (unitsMetafield?.value) {
    const units = parseFloat(unitsMetafield.value);
    console.log("✅ Found units_per_item metafield with value:", units);
    return units;
  }

  console.log("❌ No units_per_item metafield found on product");
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
    mf => mf.namespace === 'custom' && mf.key === 'minimum_unit_price'
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
    mf => mf.namespace === 'custom' && mf.key === 'mup_debug'
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
              { key: "mup_units_per_item", value: debugData.unitsPerItem.toString() },
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
    shopId: input.shop?.id ?? null,
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

  console.log("🏴󠁧󠁢󠁳󠁣󠁴󠁿 Customer is in Scotland - applying MUP logic");

  const operations: any[] = [];

  // Assemble MUP configuration from shop metafields (aliased in query)
  const shop = input.shop;
  const shopMetafields: Metafield[] = [];
  
  if (shop?.levyProduct) {
    shopMetafields.push({
      namespace: 'custom',
      key: 'mup_levy_product',
      value: shop.levyProduct.value ?? '',
      type: shop.levyProduct.type ?? '',
      jsonValue: undefined
    });
  }
  if (shop?.minimumUnitPrice) {
    shopMetafields.push({
      namespace: 'custom',
      key: 'minimum_unit_price',
      value: shop.minimumUnitPrice.value ?? '',
      type: shop.minimumUnitPrice.type ?? '',
      jsonValue: undefined
    });
  }
  if (shop?.debugFlag) {
    shopMetafields.push({
      namespace: 'custom',
      key: 'mup_debug',
      value: shop.debugFlag.value ?? '',
      type: shop.debugFlag.type ?? '',
      jsonValue: undefined
    });
  }

  console.log("🏪 Shop metafields assembled:", shopMetafields.length);
  console.log("🏪 Shop metafields:", shopMetafields.map(mf => ({
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

  // Process each cart line and add levy child lines where needed
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

    // Skip if this line is already a MUP levy (check attribute)
    const mupAttribute = (line as any).attribute;
    if (mupAttribute?.value === "true") {
      console.log("⏭️ Skipping existing MUP levy line");
      continue;
    }

    // Skip if this line has already been processed by our transform
    const originalPriceAttribute = (line as any).originalPriceAttribute;
    if (originalPriceAttribute?.value) {
      console.log("⏭️ Skipping already-transformed line (has original_price attribute)");
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
      console.log("📌 Creating levy child line (quantity will match parent)");

      const operation = {
        expand: {
          cartLineId: line.id,
          expandedCartItems: [
            // First: Keep the original product at its original price
            {
              merchandiseId: productVariant.id,
              quantity: 1,
              price: {
                adjustment: {
                  fixedPricePerUnit: {
                    amount: originalPricePerItem.toString(),
                  },
                },
              },
              attributes: [
                {
                  key: "original_price",
                  value: originalPricePerItem.toString(),
                },
              ],
            },
            // Second: Add the levy as a separate child line
            {
              merchandiseId: fullVariantId,
              quantity: 1,
              price: {
                adjustment: {
                  fixedPricePerUnit: {
                    amount: roundedLevyPerItem.toString(),
                  },
                },
              },
              attributes: [
                {
                  key: "mup",
                  value: "true",
                },
                {
                  key: "mup_levy_per_item",
                  value: roundedLevyPerItem.toString(),
                },
                {
                  key: "parent_line_id",
                  value: line.id,
                },
                ...(debugEnabled ? [
                  { key: "mup_debug", value: "true" },
                  { key: "mup_units_per_item", value: unitsPerItem.toString() },
                  { key: "mup_minimum_unit_price", value: minimumUnitPrice.toString() },
                ] : []),
              ],
            },
          ],
        },
      };

      operations.push(operation);
      console.log("✅ Levy operation created for line:", line.id);
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