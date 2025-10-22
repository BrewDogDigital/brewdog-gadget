/**
 * Gets current MUP settings from Shopify shop metafields.
 */
export const params = {};

export const run = async ({ connections, logger }: any) => {
  const shopify = connections.shopify.current;
  if (!shopify) {
    throw new Error("No Shopify connection context");
  }

  try {
    // Fetch shop with metafields
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
          geoipEnabled: metafield(namespace: "custom", key: "mup_geoip_enabled") {
            value
          }
        }
      }
    `;

    const response = await shopify.graphql(shopQuery);
    const shop = (response as any)?.shop;

    if (!shop) {
      throw new Error("Failed to fetch shop data");
    }

    return {
      success: true,
      settings: {
        levyVariantId: shop.mupLevyProduct?.value || "",
        minimumUnitPrice: shop.minimumUnitPrice?.value || "0.65",
        enforcementEnabled: shop.enforcementEnabled?.value === "true",
        geoipEnabled: shop.geoipEnabled?.value === "true",
      },
    };

  } catch (error) {
    logger.error({ error }, "Error fetching MUP settings");
    throw new Error(`Failed to fetch settings: ${error.message}`);
  }
};

