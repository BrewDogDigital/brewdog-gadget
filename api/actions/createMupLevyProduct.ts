/**
 * Creates a MUP Levy Product in Shopify and returns the variant ID.
 * This product is used to add levy charges as child line items in the cart.
 */
export const params = {};

export const run = async ({ connections, logger }: any) => {
  const shopify = connections.shopify.current;
  if (!shopify) {
    throw new Error("No Shopify connection context");
  }

  logger.info("Creating MUP levy product");

  try {
    // Create the levy product
    const createProductMutation = `#graphql
      mutation createProduct($input: ProductInput!) {
        productCreate(input: $input) {
          product {
            id
            title
            handle
            status
            variants(first: 1) {
              edges {
                node {
                  id
                  price
                  sku
                }
              }
            }
          }
          userErrors {
            field
            message
          }
        }
      }
    `;

    const productInput = {
      title: "MUP Levy",
      descriptionHtml: "<p>Minimum Unit Pricing levy charge for Scotland compliance. This product is automatically added to carts when alcohol products are priced below the legal minimum.</p>",
      handle: "mup-levy",
      status: "ACTIVE",
      vendor: "System",
      productType: "Fee",
      tags: ["mup", "levy", "compliance", "scotland"],
    };

    logger.info({ productInput }, "Creating levy product with input");

    const createResponse = await shopify.graphql(createProductMutation, {
      input: productInput,
    });

    const userErrors = (createResponse as any)?.productCreate?.userErrors ?? [];
    if (userErrors.length > 0) {
      logger.error({ userErrors }, "Failed to create levy product");
      throw new Error(`Failed to create levy product: ${JSON.stringify(userErrors)}`);
    }

    const product = (createResponse as any)?.productCreate?.product;
    if (!product) {
      throw new Error("Product creation returned no product data");
    }

    const variantId = product.variants.edges[0]?.node?.id;
    if (!variantId) {
      throw new Error("Product created but no variant ID found");
    }

    logger.info({ productId: product.id, variantId }, "MUP levy product created successfully with default variant");

    // Now save the variant ID to shop metafield
    const shopQuery = `#graphql
      query {
        shop {
          id
        }
      }
    `;
    const shopResp = await shopify.graphql(shopQuery);
    const shopId = (shopResp as any)?.shop?.id;

    if (shopId) {
      const metafieldsSetMutation = `#graphql
        mutation metafieldsSet($metafields: [MetafieldsSetInput!]!) {
          metafieldsSet(metafields: $metafields) {
            metafields { id key namespace value }
            userErrors { field message }
          }
        }
      `;

      await shopify.graphql(metafieldsSetMutation, {
        metafields: [
          {
            ownerId: shopId,
            namespace: "custom",
            key: "mup_levy_product",
            type: "single_line_text_field",
            value: variantId,
          },
        ],
      });

      logger.info("Levy product variant ID saved to shop metafield");
    }

    return {
      success: true,
      product: {
        id: product.id,
        title: product.title,
        handle: product.handle,
        variantId: variantId,
      },
    };

  } catch (error) {
    logger.error({ error }, "Error creating MUP levy product");
    throw new Error(`Failed to create levy product: ${error.message}`);
  }
};

