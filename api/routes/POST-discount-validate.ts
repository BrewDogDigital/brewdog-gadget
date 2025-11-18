import type { RouteContext } from "gadget-server";

/**
 * API endpoint to validate discount codes using Shopify Admin API
 * Endpoint: POST /discount-validate
 * Public API endpoint accessible from storefront
 */
export default async function route({ request, reply, connections, logger, api }: RouteContext) {
  try {
    // Parse request body
    let body: any = {};
    if (request.body) {
      body = typeof request.body === 'string' ? JSON.parse(request.body) : request.body;
    }
    const code = body?.code;
    const shopDomain = body?.shopDomain; // Optional shop domain from frontend

    if (!code || typeof code !== 'string' || code.trim() === '') {
      return reply.code(400).send({
        valid: false,
        message: "Please enter a discount code."
      });
    }

    // Get Shopify connection
    // Try to get connection for specific shop domain if provided, otherwise use current
    let shopify;
    if (shopDomain) {
      try {
        shopify = await connections.shopify.forShopDomain(shopDomain);
      } catch (e) {
        logger.error({ error: e, shopDomain }, "[Discount Validate] Failed to get connection for shop domain");
      }
    }
    
    // Fallback to current connection if no shop domain or forShopDomain failed
    if (!shopify) {
      shopify = connections?.shopify?.current;
    }

    if (!shopify) {
      logger.error("[Discount Validate] No Shopify connection available");
      return reply.code(500).send({
        valid: false,
        message: "Unable to validate discount code. Please try again."
      });
    }

    // Query Shopify Admin API to check if discount code exists and is active
    const discountQuery = `#graphql
      query GetDiscountCode($code: String!) {
        codeDiscountNodeByCode(code: $code) {
          id
          codeDiscount {
            __typename
            ... on DiscountCodeBasic {
              title
              status
              startsAt
              endsAt
              usageLimit
              appliesOncePerCustomer
            }
            ... on DiscountCodeBxgy {
              title
              status
              startsAt
              endsAt
              usageLimit
              appliesOncePerCustomer
            }
            ... on DiscountCodeFreeShipping {
              title
              status
              startsAt
              endsAt
              usageLimit
              appliesOncePerCustomer
            }
          }
        }
      }
    `;

    try {
      const result = await shopify.graphql(discountQuery, {
        code: code.trim()
      });

      // Handle GraphQL response structure
      const data = (result as any)?.data || result;
      const node = data?.codeDiscountNodeByCode;

      if (!node || !node.codeDiscount) {
        return reply.code(200).send({
          valid: false,
          message: "That discount code is invalid or doesn't exist."
        });
      }

      const discount = node.codeDiscount;

      // Check if discount is active
      if (discount.status !== "ACTIVE") {
        return reply.code(200).send({
          valid: false,
          message: "That discount code is not currently active."
        });
      }

      // Check if discount has started
      if (discount.startsAt && new Date(discount.startsAt) > new Date()) {
        return reply.code(200).send({
          valid: false,
          message: "That discount code hasn't started yet."
        });
      }

      // Check if discount has ended
      if (discount.endsAt && new Date(discount.endsAt) < new Date()) {
        return reply.code(200).send({
          valid: false,
          message: "That discount code has expired."
        });
      }

      // Discount is valid - return redirect URL
      return reply.code(200).send({
        valid: true,
        redirectUrl: `/discount/${encodeURIComponent(code.trim())}?redirect=/cart`
      });

    } catch (graphqlError: any) {
      logger.error({ error: graphqlError }, "[Discount Validate] GraphQL error");
      
      // If the code doesn't exist, Shopify returns an error
      if (graphqlError.message?.includes("not found") || graphqlError.message?.includes("doesn't exist")) {
        return reply.code(200).send({
          valid: false,
          message: "That discount code is invalid or doesn't exist."
        });
      }

      return reply.code(500).send({
        valid: false,
        message: "Unable to validate discount code. Please try again."
      });
    }

  } catch (error: any) {
    logger.error({ error }, "[Discount Validate] Error");
    return reply.code(500).send({
      valid: false,
      message: "Something went wrong validating the discount code."
    });
  }
}

