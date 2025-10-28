/**
 * Sets up MUP metafield definitions in Shopify.
 * This creates the metafield definitions so they appear properly in the Shopify admin.
 * Run this once during initial setup.
 */
export const params = {};

export const run = async ({ connections, logger }: any) => {
  const shopify = connections.shopify.current;
  if (!shopify) {
    throw new Error("No Shopify connection context");
  }

  logger.info("Setting up MUP metafield definitions");

  try {
    const metafieldDefinitionCreateMutation = `#graphql
      mutation CreateMetafieldDefinition($definition: MetafieldDefinitionInput!) {
        metafieldDefinitionCreate(definition: $definition) {
          createdDefinition {
            id
            name
            namespace
            key
          }
          userErrors {
            field
            message
          }
        }
      }
    `;

    const definitions = [
      // Shop-level metafields
      {
        name: "MUP Levy Product",
        namespace: "custom",
        key: "mup_levy_product",
        description: "Product variant ID used for MUP levy charges",
        type: "single_line_text_field",
        ownerType: "SHOP",
      },
      {
        name: "Minimum Unit Price",
        namespace: "custom",
        key: "minimum_unit_price",
        description: "Minimum unit price for alcohol in GBP (e.g. 0.65)",
        type: "number_decimal",
        ownerType: "SHOP",
      },
      {
        name: "MUP Enforcement Enabled",
        namespace: "custom",
        key: "mup_enforcement_enabled",
        description: "Enable or disable MUP enforcement",
        type: "boolean",
        ownerType: "SHOP",
      },
      {
        name: "MUP GeoIP Enabled",
        namespace: "custom",
        key: "mup_geoip_enabled",
        description: "Enable GeoIP-based location detection",
        type: "boolean",
        ownerType: "SHOP",
      },
      // Product variant-level metafields
      {
        name: "Alcohol Units Per Item",
        namespace: "custom",
        key: "total_units",
        description: "Total number of alcohol units in this product (used for MUP calculation)",
        type: "number_decimal",
        ownerType: "PRODUCTVARIANT",
        validations: [
          {
            name: "min",
            value: "0",
          },
        ],
      },
      {
        name: "ABV Percentage",
        namespace: "custom",
        key: "abv_percentage",
        description: "Alcohol by volume percentage (e.g. 5.0 for 5%)",
        type: "number_decimal",
        ownerType: "PRODUCTVARIANT",
        validations: [
          {
            name: "min",
            value: "0",
          },
          {
            name: "max",
            value: "100",
          },
        ],
      },
      {
        name: "Volume (ml)",
        namespace: "custom",
        key: "volume_ml",
        description: "Product volume in milliliters (e.g. 330 for a 330ml can)",
        type: "number_integer",
        ownerType: "PRODUCTVARIANT",
        validations: [
          {
            name: "min",
            value: "0",
          },
        ],
      },
    ];

    const results = [];

    for (const definition of definitions) {
      try {
        logger.info({ key: definition.key }, "Creating metafield definition");
        
        const response = await shopify.graphql(metafieldDefinitionCreateMutation, {
          definition,
        });

        const userErrors = (response as any)?.metafieldDefinitionCreate?.userErrors ?? [];
        
        if (userErrors.length > 0) {
          // Check if error is just that it already exists
          const alreadyExists = userErrors.some((e: any) => 
            e.message?.includes("taken") || e.message?.includes("already exists")
          );
          
          if (alreadyExists) {
            logger.info({ key: definition.key }, "Metafield definition already exists");
            results.push({ key: definition.key, status: "already_exists" });
          } else {
            logger.error({ key: definition.key, userErrors }, "Failed to create metafield definition");
            results.push({ key: definition.key, status: "error", errors: userErrors });
          }
        } else {
          const created = (response as any)?.metafieldDefinitionCreate?.createdDefinition;
          logger.info({ key: definition.key, id: created?.id }, "Metafield definition created");
          results.push({ key: definition.key, status: "created", id: created?.id });
        }
      } catch (error) {
        logger.error({ key: definition.key, error }, "Error creating metafield definition");
        results.push({ key: definition.key, status: "error", error: error.message });
      }
    }

    return {
      success: true,
      message: "Metafield definitions setup completed",
      results,
    };

  } catch (error) {
    logger.error({ error }, "Error setting up metafield definitions");
    throw new Error(`Setup failed: ${error.message}`);
  }
};

