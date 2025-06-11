import type {
  RunInput,
  FunctionRunResult,
  CartOperation,
  UpdateOperation
} from "../generated/api";

export function run(input: RunInput): FunctionRunResult {
  // Replace with your actual Pfand product variant ID
  const PFAND_PRODUCT_VARIANT_ID =
    "gid://shopify/ProductVariant/48421177786633";

  const cart = input.cart;

  let totalPfandCharge = 0;
  let pfandCartLineId: string | null = null;

  for (const line of cart.lines) {
    const merchandise = line.merchandise;
    console.log("MERCHANDISE", merchandise);

    if (merchandise.__typename !== "ProductVariant") {
      continue;
    }

    const variant = merchandise;

    if (variant.id === PFAND_PRODUCT_VARIANT_ID) {
      // This is the Pfand product line
      pfandCartLineId = line.id;
      continue;
    }

    // Retrieve the 'pfand_per_item' metafield value
    const pfandMetafield = variant.metafield;

    let pfandPerItemValue = 0;

    if (pfandMetafield && pfandMetafield.value) {
      // Replace comma with period before parsing
      const valueWithPeriod = pfandMetafield.value.replace(",", ".");
      pfandPerItemValue = parseFloat(valueWithPeriod);
    }

    if (pfandPerItemValue > 0) {
      // Calculate Pfand charge for this line
      const linePfandCharge = pfandPerItemValue * line.quantity;
      totalPfandCharge += linePfandCharge;
    }
  }

  const operations: CartOperation[] = [];

  if (pfandCartLineId) {
    // Round the total Pfand charge to two decimal places
    totalPfandCharge = parseFloat(totalPfandCharge.toFixed(2));

    // Create an update operation to adjust the Pfand product line's price
    const updateOperation: UpdateOperation = {
      cartLineId: pfandCartLineId,
      price: {
        adjustment: {
          fixedPricePerUnit: {
            amount: totalPfandCharge.toString(),
          },
        },
      },
    };

    operations.push({ update: updateOperation });
  }
  
    return { operations };
  }