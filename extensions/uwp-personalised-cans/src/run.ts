import type {
  RunInput,
  FunctionRunResult,
} from "../generated/api";

const NO_CHANGES: FunctionRunResult = {
  operations: [],
};

const PUNK_CAN_VARIANT_ID = 53392890167622
const HAZY_CAN_VARIANT_ID = 53784849154374
const LOST_CAN_VARIANT_ID = 54459722137926

export function run(input: RunInput): FunctionRunResult {
  console.log('running');

  const operations: { expand: { cartLineId: string; expandedCartItems: any[] } }[] = [];

  for (const line of input.cart.lines) {
    const expandOperation = optionallyBuildExpandOperation(line);
    console.log("expandOperation", expandOperation);
    if (expandOperation) {
      operations.push({ expand: expandOperation });
    }
  }
  console.log("operations", operations);
  return operations.length > 0 ? { operations } : NO_CHANGES;
};

function optionallyBuildExpandOperation(line) {
  const merchandise = line.merchandise;
  const cartLineId = line.id;
  console.log("cartLineId", cartLineId);
  console.log("merchandise", merchandise);

  const hasExpandMetafields =
    !!merchandise.pc_bundle_components && !!merchandise.pc_bundle_quantities;

  console.log("hasExpandMetafields", hasExpandMetafields);

  if (merchandise.__typename === "ProductVariant" && hasExpandMetafields) {
    const componentReferences = JSON.parse(
      merchandise.pc_bundle_components.value
    );
    console.log("componentReferences", componentReferences);
    const componentQuantities = JSON.parse(
      merchandise.pc_bundle_quantities.value
    );
    console.log("componentQuantities", componentQuantities);


    if (
      componentReferences.length !== componentQuantities.length ||
      componentReferences.length === 0
    ) {
      throw new Error("Invalid bundle composition");
    }

    const expandedCartItems = componentReferences.map(
      (merchandiseId, index) => ({
        attributes: merchandiseId == `gid://shopify/ProductVariant/${PUNK_CAN_VARIANT_ID}` || 
                   merchandiseId == `gid://shopify/ProductVariant/${HAZY_CAN_VARIANT_ID}` || 
                   merchandiseId == `gid://shopify/ProductVariant/${LOST_CAN_VARIANT_ID}` ? [
          {
            key: "_document_id",
            value: line.document_id.value,
          },
          {
            key: "_uuid",
            value: line.uuid.value,
          },
          {
            key: "name",
            value: line.name.value,
          },
          {
            key: "message",
            value: line.message.value,
          }
        ] : [],
        merchandiseId: merchandiseId,
        quantity: componentQuantities[index],
      })
    );

    console.log("expandedCartItems", expandedCartItems);

    if (expandedCartItems.length > 0) {
      return { cartLineId, expandedCartItems };
    }
  }

  return null;
}
