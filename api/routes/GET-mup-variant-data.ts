import type { RouteContext } from "gadget-server";

/**
 * API endpoint to get variant data for MUP levy calculation
 * Endpoint: GET /mup-variant-data?variantId=xxx
 * 
 * Returns variant data including price and total_units metafield
 */
export default async function route({ request, reply, connections, logger }: RouteContext) {
  try {
    // Set CORS headers
    reply.header('Access-Control-Allow-Origin', '*');
    reply.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
    reply.header('Access-Control-Allow-Headers', 'Content-Type');

    // Handle preflight
    if (request.method === 'OPTIONS') {
      return reply.code(200).send();
    }

    const variantId = (request.query as any)?.variantId;
    const shopDomain = (request.query as any)?.shopDomain; // Shop domain from frontend
    
    if (!variantId) {
      return reply.code(400).send({
        success: false,
        error: "variantId query parameter is required"
      });
    }

    // Get Shopify connection for specific shop domain if provided
    let shopify;
    if (shopDomain) {
      try {
        shopify = await connections.shopify.forShopDomain(shopDomain);
      } catch (e) {
        logger.error({ error: e, shopDomain }, "[MUP Variant Data] Failed to get connection for shop domain");
      }
    }
    
    // Fallback to current connection if no shop domain or forShopDomain failed
    if (!shopify) {
      shopify = connections?.shopify?.current;
    }

    if (!shopify) {
      logger.error("[MUP Variant Data] No Shopify connection available");
      return reply.code(500).send({
        success: false,
        error: "Shopify connection not available"
      });
    }

    // Convert variant ID to GID format if needed
    let variantGid = variantId;
    if (!variantId.startsWith('gid://')) {
      variantGid = `gid://shopify/ProductVariant/${variantId}`;
    }

    // GraphQL query to fetch variant data with metafields using Admin API
    const query = `#graphql
      query getVariantData($id: ID!) {
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

    const response: any = await shopify.graphql(query, {
      id: variantGid
    });

    const variant = response.productVariant;

    if (!variant) {
      return reply.code(404).send({
        success: false,
        error: "Variant not found"
      });
    }

    const units = parseFloat(variant.metafield?.value || '0');
    // Admin API GraphQL returns price as decimal string (e.g., "10.00" for £10.00)
    const price = parseFloat(variant.price || '0');

    return reply.code(200).send({
      success: true,
      variant: {
        id: variant.id,
        price: price,
        units: units
      }
    });

  } catch (error: any) {
    logger.error({ error }, "[MUP Variant Data] Error");
    return reply.code(500).send({
      success: false,
      error: "Failed to get variant data",
      message: error.message
    });
  }
}

