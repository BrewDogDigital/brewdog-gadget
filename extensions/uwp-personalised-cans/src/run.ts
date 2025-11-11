import type {
  RunInput,
  FunctionRunResult,
} from "../generated/api";

const NO_CHANGES: FunctionRunResult = {
  operations: [],
};


export function run(input: RunInput): FunctionRunResult {
  console.log('running');

  const operations: { update: { cartLineId: string; title?: string; attributes?: any[] } }[] = [];
  
  for (const line of input.cart.lines) {
    const updateOperation = optionallyBuildUpdateOperation(line);
    if (updateOperation) {
      operations.push({ update: updateOperation });
    }
  }
  return operations.length > 0 ? { operations } : NO_CHANGES;
};


function optionallyBuildUpdateOperation(line) {
  const merchandise = line.merchandise;
  const cartLineId = line.id;
    
  const hasPersonalizationData = !!(
    line.document_id?.value && 
    line.uuid?.value && 
    line.name?.value && 
    line.message?.value
  );

  // Only update items that have personalization data
  if (merchandise.__typename === "ProductVariant" && hasPersonalizationData) {
    const attributes = [
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
      },
      ...(merchandise.sku ? [
        {
          key: "parent_sku",
          value: merchandise.sku,
        }
      ] : [])
    ].filter(attr => attr.key !== "_proof");

    return { cartLineId, attributes };
  }

  return null;
}
