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
  maxmindAccountId: { type: "string", required: false, default: "" },
  maxmindLicenseKey: { type: "string", required: false, default: "" },
  overrideCodes: { type: "string", required: false, default: "" },
};

export const run = async ({ params, connections, logger }: any) => {
  const shopify = connections.shopify.current;
  if (!shopify) {
    throw new Error("No Shopify connection context");
  }

  const { levyVariantId, minimumUnitPrice, enforcementEnabled, geoipEnabled, maxmindAccountId, maxmindLicenseKey, overrideCodes } = params;

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

  // Build metafields array, only including optional fields if they have values
  const metafieldsInput: any[] = [
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

  // Only include optional metafields if they have non-empty values
  if (maxmindAccountId && maxmindAccountId.trim() !== "") {
    metafieldsInput.push({
      ownerId: shopId,
      namespace: "custom",
      key: "mup_maxmind_account_id",
      type: "single_line_text_field",
      value: String(maxmindAccountId),
    });
  }

  if (maxmindLicenseKey && maxmindLicenseKey.trim() !== "") {
    metafieldsInput.push({
      ownerId: shopId,
      namespace: "custom",
      key: "mup_maxmind_license_key",
      type: "single_line_text_field",
      value: String(maxmindLicenseKey),
    });
  }

  if (overrideCodes && overrideCodes.trim() !== "") {
    metafieldsInput.push({
      ownerId: shopId,
      namespace: "custom",
      key: "mup_override_codes",
      type: "multi_line_text_field",
      value: String(overrideCodes),
    });
  }

  logger.info({ metafieldsInput }, "Attempting to set metafields");

  const setResp = await shopify.graphql(metafieldsSetMutation, {
    metafields: metafieldsInput,
  });

  const errors = (setResp as any)?.metafieldsSet?.userErrors ?? [];
  const metafields = (setResp as any)?.metafieldsSet?.metafields ?? [];

  // Separate critical errors (first 4 metafields) from optional ones
  const criticalErrors = errors.filter((error: any) => {
    // Check if error is for one of the first 4 critical metafields
    const errorField = error.field?.[1]; // field array format: ["metafields", index, "value"]
    const errorIndex = parseInt(errorField);
    return errorIndex !== undefined && errorIndex < 4;
  });

  const optionalErrors = errors.filter((error: any) => {
    const errorField = error.field?.[1];
    const errorIndex = parseInt(errorField);
    return errorIndex !== undefined && errorIndex >= 4;
  });

  // Log optional errors as warnings but don't fail
  if (optionalErrors.length > 0) {
    logger.warn({ optionalErrors }, "Some optional metafields failed to save, but continuing");
  }

  // Only throw if critical metafields failed
  if (criticalErrors.length > 0) {
    logger.error({ criticalErrors, optionalErrors }, "Critical metafields failed to save");
    throw new Error(`Failed to save critical settings: ${JSON.stringify(criticalErrors)}`);
  }

  logger.info({ metafields, optionalErrors: optionalErrors.length > 0 ? optionalErrors : undefined }, "MUP settings saved successfully");

  return { success: true, metafields, warnings: optionalErrors.length > 0 ? optionalErrors : undefined };
};
