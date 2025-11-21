import { applyParams, preventCrossShopDataAccess, save, ActionOptions, CreateShopifyCartLineItemActionContext } from "gadget-server";

/**
 * @param { CreateShopifyCartLineItemActionContext } context
 */
export async function run({ params, record, logger, api, connections }) {
  applyParams(params, record);
  await preventCrossShopDataAccess(params, record);
  await save(record);
};

/**
 * @param { CreateShopifyCartLineItemActionContext } context
 */
export async function onSuccess({ params, record, logger, api, connections }) {
  const shopify = connections.shopify.current;
  if (!shopify) {
    logger.warn("No Shopify connection available, skipping MUP check");
    return;
  }

  try {
    // Get the cart line item with related data
    const lineItem = await api.shopifyCartLineItem.findOne(record.id, {
      select: {
        id: true,
        variant: {
          id: true,
        },
        cart: {
          id: true,
          token: true,
        },
        price: true,
        quantity: true,
        properties: true,
      },
    });

    if (!lineItem || !lineItem.variant || !lineItem.cart) {
      logger.info("Line item missing variant or cart, skipping MUP check");
      return;
    }

    // Skip if this is already a MUP levy line (check properties)
    const isMupLevy = lineItem.properties?.some(
      (prop) => prop.name === "mup" && prop.value === "true"
    );
    if (isMupLevy) {
      logger.info("Line item is already a MUP levy, skipping");
      return;
    }

    // Get MUP settings from shop metafields
    const shopQuery = `#graphql
      query {
        shop {
          id
          mupLevyProduct: metafield(namespace: "custom", key: "mup_levy_product") {
            value
          }
          minimumUnitPrice: metafield(namespace: "custom", key: "minimum_unit_price") {
            value
          }
          enforcementEnabled: metafield(namespace: "custom", key: "mup_enforcement_enabled") {
            value
          }
        }
      }
    `;

    const shopResponse = await shopify.graphql(shopQuery);
    const shop = shopResponse?.shop;

    if (!shop) {
      logger.warn("Failed to fetch shop data");
      return;
    }

    // Check if MUP enforcement is enabled
    if (shop.enforcementEnabled?.value !== "true") {
      logger.info("MUP enforcement is disabled, skipping");
      return;
    }

    const levyVariantId = shop.mupLevyProduct?.value;
    const minimumUnitPrice = parseFloat(shop.minimumUnitPrice?.value || "0.65");

    if (!levyVariantId) {
      logger.warn("MUP levy product not configured");
      return;
    }

    // Get variant metafields to check units
    const variantQuery = `#graphql
      query getVariant($id: ID!) {
        productVariant(id: $id) {
          id
          price
          metafield(namespace: "custom", key: "total_units") {
            value
            type
          }
        }
      }
    `;

    const variantResponse = await shopify.graphql(variantQuery, {
      id: lineItem.variant.id,
    });

    const variant = variantResponse?.productVariant;
    if (!variant) {
      logger.warn("Failed to fetch variant data");
      return;
    }

    const unitsPerItem = parseFloat(variant.metafield?.value || "0");
    if (unitsPerItem <= 0) {
      logger.info("Product has no alcohol units, skipping MUP check");
      return;
    }

    // Calculate MUP floor and check if below MUP
    const pricePerItem = parseFloat(lineItem.price || "0");
    const mupFloorPerItem = unitsPerItem * minimumUnitPrice;

    logger.info({
      pricePerItem,
      mupFloorPerItem,
      unitsPerItem,
      minimumUnitPrice,
    }, "MUP check for line item");

    if (pricePerItem < mupFloorPerItem) {
      const levyPerItem = mupFloorPerItem - pricePerItem;
      const roundedLevyPerItem = Math.ceil(levyPerItem * 100) / 100;

      logger.info({
        levyPerItem: roundedLevyPerItem,
        quantity: lineItem.quantity,
        parentLineId: lineItem.id,
        levyVariantId: levyVariantId,
      }, "Line item is below MUP, levy needed");

      // Note: We cannot directly add items to a cart from a backend action
      // because we need the Storefront API token (not Admin API).
      // The levy variant should be added via:
      // 1. A webhook that triggers when cart line items are created
      // 2. A frontend script that adds the levy variant
      // 3. The cart transform will adjust the price of existing levy lines
      
      // For now, we log that a levy is needed. The cart transform will handle
      // adjusting prices of existing levy lines that reference this parent line.
    } else {
      logger.info("Line item meets MUP requirements, no levy needed");
    }
  } catch (error) {
    logger.error({ error: error.message, stack: error.stack }, "Error checking MUP for line item");
    // Don't throw - we don't want to break cart line item creation if MUP check fails
  }
};

/** @type { ActionOptions } */
export const options = { actionType: "create" };
