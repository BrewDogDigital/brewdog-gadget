/**
 * Activates the Cart Transform by pointing the store's CartTransform to the latest
 * deployed App Function with apiType CART_TRANSFORM.
 *
 * Run this once after deploying your cart transform. If a Cart Transform already exists,
 * this will update it to the latest function version.
 */
export const params = {
  shopDomain: { type: "string", required: false },
};

export const run = async ({ params, connections, logger }: any) => {
  // Prefer explicit shop domain when provided; fallback to current connection
  const shopDomain: string | undefined = params?.shopDomain;
  const shopify = shopDomain
    ? await connections.shopify.forShopDomain(shopDomain)
    : connections.shopify.current;

  if (!shopify) {
    throw new Error(
      "Must run in a Shopify connection context. Pass params.shopDomain (e.g. 'brewdog-dev.myshopify.com')."
    );
  }

  // 1) Find the latest CART_TRANSFORM function published by this app
  // Prefer the top-level `functions` connection (newer Admin API). If unsupported,
  // fall back to older shapes.
  const topLevelFunctionsQuery = `#graphql
    query($apiType: FunctionApiType) {
      functions(first: 50, apiType: $apiType) {
        nodes { id title apiType apiVersion }
      }
    }
  `;

  let functions: any[] = [];
  try {
    const fnResp = await shopify.graphql(topLevelFunctionsQuery, {
      variables: { apiType: "CART_TRANSFORM" },
    });
    functions = (fnResp as any)?.functions?.nodes ?? [];
    logger.info({ functionsFound: functions.length, functions }, "Top-level functions query result");
  } catch (e) {
    logger.warn({ error: String(e) }, "Top-level functions query failed; trying extensionRegistrations fallback");
  }

  if (!functions.length) {
    // Fallback: use extension registrations and filter to cart transform
    const extRegsQuery = `#graphql
      query {
        app {
          extensionRegistrations(first: 100, type: FUNCTION) {
            nodes { id title type handle }
          }
        }
      }
    `;
    try {
      const extResp = await shopify.graphql(extRegsQuery);
      const regs = (extResp as any)?.app?.extensionRegistrations?.nodes ?? [];
      logger.info({ allRegistrations: regs }, "All extension registrations");
      // Filter for cart transform by handle or title
      functions = regs.filter((r: any) => 
        r?.handle?.includes('cart-transform') || 
        r?.handle?.includes('mup') ||
        r?.title?.toLowerCase().includes('cart')
      );
      if (functions.length) {
        logger.info({ count: functions.length, functions }, "Using filtered extensionRegistrations as function source");
      } else {
        // If no matches, use all function registrations as last resort
        functions = regs.filter((r: any) => typeof r?.id === "string");
        logger.info({ count: functions.length }, "Using all function registrations as fallback");
      }
    } catch (e) {
      logger.warn({ error: String(e) }, "Fallback extensionRegistrations query failed");
    }
  }

  if (!functions.length) {
    logger.error({}, "No CART_TRANSFORM functions found for this app. Deploy the extension first.");
    throw new Error("No CART_TRANSFORM functions found. Did you deploy the cart transform?");
  }

  // Pick the first (or latest) function; if multiple exist, prefer the last returned
  const targetFunction = functions[functions.length - 1];
  logger.info({ targetFunction }, "Using AppFunction for Cart Transform activation");

  // Helper mutations
  const createMutation = `#graphql
    mutation cartTransformCreate($functionId: String!) {
      cartTransformCreate(functionId: $functionId) {
        cartTransform { id functionId }
        userErrors { field message }
      }
    }
  `;

  const updateMutation = `#graphql
    mutation cartTransformUpdate($id: ID!, $functionId: String!) {
      cartTransformUpdate(id: $id, functionId: $functionId) {
        cartTransform { id functionId }
        userErrors { field message }
      }
    }
  `;

  // 2) Try to create; if it already exists, update instead
  const createResp = await shopify.graphql(createMutation, {
    variables: { functionId: targetFunction.id },
  });

  const createErrors = (createResp as any)?.cartTransformCreate?.userErrors ?? [];
  const created = (createResp as any)?.cartTransformCreate?.cartTransform ?? null;

  if (created && !createErrors.length) {
    logger.info({ created }, "Cart Transform created");
    return { result: created };
  }

  logger.info({ createErrors }, "cartTransformCreate returned errors, attempting update");

  // Fetch existing transform id (Admin API exposes a singleton)
  const existingQuery = `#graphql
    query {
      cartTransform { id functionId }
    }
  `;

  const existingResp = await shopify.graphql(existingQuery);
  const existing = (existingResp as any)?.cartTransform ?? null;

  if (!existing?.id) {
    logger.error({ existingResp }, "Couldn't find existing Cart Transform to update");
    throw new Error("Cart Transform not found and create failed. Check app permissions and deploy status.");
  }

  const updateResp = await shopify.graphql(updateMutation, {
    variables: { id: existing.id, functionId: targetFunction.id },
  });

  const updateErrors = (updateResp as any)?.cartTransformUpdate?.userErrors ?? [];
  const updated = (updateResp as any)?.cartTransformUpdate?.cartTransform ?? null;

  if (updated && !updateErrors.length) {
    logger.info({ updated }, "Cart Transform updated");
    return { result: updated };
  }

  logger.error({ updateResp }, "Failed to update Cart Transform");
  throw new Error("Failed to activate Cart Transform. See logs for details.");
};


