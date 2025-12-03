import type { RouteContext } from "gadget-server";

/**
 * API endpoint to expose MUP override discount codes to the frontend
 * Endpoint: /apps/mup/override-codes
 */
export default async function route({ request, reply, connections, logger, api }: RouteContext) {
  // Set CORS headers to allow requests from Shopify storefronts
  reply.header('Access-Control-Allow-Origin', '*');
  reply.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
  reply.header('Access-Control-Allow-Headers', 'Content-Type, Accept');
  // Prevent caching to ensure fresh data
  reply.header('Cache-Control', 'no-cache, no-store, must-revalidate');
  reply.header('Pragma', 'no-cache');
  reply.header('Expires', '0');
  
  // Handle preflight OPTIONS request
  if (request.method === 'OPTIONS') {
    return reply.code(200).send();
  }

  try {
    // Get shop domain from query parameter (optional, for public routes)
    const shopDomain = (request.query as any)?.shopDomain;
    
    // Get Shopify connection
    let shopify;
    if (shopDomain) {
      try {
        shopify = await connections.shopify.forShopDomain(shopDomain);
      } catch (e) {
        logger.error({ error: e, shopDomain }, "[Override Codes] Failed to get connection for shop domain");
      }
    }
    
    // Fallback to current connection if no shop domain or forShopDomain failed
    if (!shopify) {
      shopify = connections?.shopify?.current;
    }

    if (!shopify) {
      logger.error("[Override Codes] No Shopify connection available");
      return reply.code(500).send({
        success: false,
        error: "No Shopify connection available",
        codes: []
      });
    }

    // Fetch shop with metafields directly
    const shopQuery = `#graphql
      query {
        shop {
          id
          overrideCodes: metafield(namespace: "custom", key: "mup_override_codes") {
            value
          }
        }
      }
    `;

    const response = await shopify.graphql(shopQuery);
    const shop = (response as any)?.shop;

    if (!shop) {
      logger.error("[Override Codes] Failed to fetch shop data");
      return reply.code(500).send({
        success: false,
        error: "Failed to fetch shop data",
        codes: []
      });
    }

    // Parse the override codes (comma or newline separated)
    const overrideCodesString = shop.overrideCodes?.value || "";
    const codes = overrideCodesString
      .split(/[,\n]+/)
      .map((code: string) => code.trim().toUpperCase())
      .filter((code: string) => code.length > 0);

    logger.info({ codesCount: codes.length }, "[Override Codes Endpoint] Returning codes");
    return reply.code(200).send({
      success: true,
      codes: codes
    });

  } catch (error) {
    console.error("[Override Codes Endpoint] Error:", error);
    return reply.code(500).send({
      success: false,
      error: "Failed to fetch override codes",
      codes: []
    });
  }
}

