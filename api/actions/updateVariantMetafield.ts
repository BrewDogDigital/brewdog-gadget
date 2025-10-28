import { ActionOptions } from "gadget-server";

export const run: ActionRun = async ({ params, connections, logger }) => {
  const { variantId, unitsPerItem } = params;
  const shopify = connections.shopify.current;

  if (!shopify) {
    throw new Error("Shopify connection is required");
  }

  logger.info({ variantId, unitsPerItem }, "Updating variant metafield");

  // Mutation to set metafield directly
  const mutation = `#graphql
    mutation setMetafield($metafields: [MetafieldsSetInput!]!) {
      metafieldsSet(metafields: $metafields) {
        metafields {
          id
          namespace
          key
          value
        }
        userErrors {
          field
          message
        }
      }
    }
  `;

  try {
    const response: any = await shopify.graphql(mutation, {
      metafields: [
        {
          ownerId: variantId,
          namespace: "custom",
          key: "total_units",
          value: String(unitsPerItem),
          type: "number_decimal"
        }
      ]
    });

    if (response.metafieldsSet?.userErrors?.length > 0) {
      const errors = response.metafieldsSet.userErrors.map((e: any) => e.message).join(", ");
      throw new Error(`Failed to update variant metafield: ${errors}`);
    }

    logger.info({ variantId }, "Successfully updated variant metafield");

    return {
      success: true,
      variantId,
      unitsPerItem
    };
  } catch (error: any) {
    logger.error({ error: error.message, variantId }, "Error updating variant metafield");
    throw new Error(`Failed to update variant: ${error.message}`);
  }
};

export const options: ActionOptions = {
  actionType: "custom"
};

export const params = {
  variantId: { type: "string", required: true },
  unitsPerItem: { type: "number", required: true },
};

