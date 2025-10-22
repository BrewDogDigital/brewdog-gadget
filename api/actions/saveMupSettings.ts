/**
 * Saves Minimum Unit Pricing settings to Shopify shop metafields.
 * - custom.mup_levy_product: string containing the levy variant ID (e.g. "gid://shopify/ProductVariant/123")
 * - custom.minimum_unit_price: decimal number as string (e.g. "0.65")
 * - custom.mup_enforcement_enabled: boolean to enable/disable MUP enforcement
 * - custom.mup_geoip_enabled: boolean to enable/disable GeoIP detection
 */
export const params = {
  levyVariantId: { type: "string", required: true },
  minimumUnitPrice: { type: "string", required: true },
  enforcementEnabled: { type: "boolean", required: false, default: true },
  geoipEnabled: { type: "boolean", required: false, default: false },
};

export const run = async ({ params, connections, logger }: any) => {
  const shopify = connections.shopify.current;
  if (!shopify) {
    throw new Error("No Shopify connection context");
  }

  const { levyVariantId, minimumUnitPrice, enforcementEnabled, geoipEnabled } = params;

  // 1) Fetch shop id
  const shopQuery = `#graphql
    query {
      shop {
        id
      }
    }
  `;
  const shopResp = await shopify.graphql(shopQuery);
  const shopId = (shopResp as any)?.shop?.id;
  if (!shopId) {
    throw new Error("Failed to load shop id");
  }
  logger.info({ shopId }, "Using shop for MUP settings");

  // 2) Write metafields
  const metafieldsSetMutation = `#graphql
    mutation metafieldsSet($metafields: [MetafieldsSetInput!]!) {
      metafieldsSet(metafields: $metafields) {
        metafields { id key namespace type value }
        userErrors { field message }
      }
    }
  `;

  const metafieldsInput = [
    {
      ownerId: shopId,
      namespace: "custom",
      key: "mup_levy_product",
      type: "single_line_text_field",
      value: levyVariantId,
    },
    {
      ownerId: shopId,
      namespace: "custom",
      key: "minimum_unit_price",
      type: "number_decimal",
      value: String(minimumUnitPrice),
    },
    {
      ownerId: shopId,
      namespace: "custom",
      key: "mup_enforcement_enabled",
      type: "boolean",
      value: String(enforcementEnabled),
    },
    {
      ownerId: shopId,
      namespace: "custom",
      key: "mup_geoip_enabled",
      type: "boolean",
      value: String(geoipEnabled),
    },
  ];

  logger.info({ metafieldsInput }, "Attempting to set metafields");

  const setResp = await shopify.graphql(metafieldsSetMutation, {
    metafields: metafieldsInput,
  });

  const errors = (setResp as any)?.metafieldsSet?.userErrors ?? [];
  if (errors.length) {
    logger.error({ errors }, "metafieldsSet returned errors");
    throw new Error(`Failed to save settings: ${JSON.stringify(errors)}`);
  }

  const metafields = (setResp as any)?.metafieldsSet?.metafields ?? [];
  logger.info({ metafields }, "MUP settings saved successfully");

  return { success: true, metafields };
};
