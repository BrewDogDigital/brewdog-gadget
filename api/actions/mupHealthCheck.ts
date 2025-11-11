/**
 * MUP Health Check Action
 * 
 * Scans all products to identify those missing alcohol unit data required for MUP compliance.
 * Returns products that need total_units metafields or ABV% + volume data.
 */
export const params = {
  limit: { type: "number", required: false, default: 50 },
  cursor: { type: "string", required: false },
};

export const run = async ({ params, connections, logger }: any) => {
  const shopify = connections.shopify.current;
  if (!shopify) {
    throw new Error("No Shopify connection context");
  }

  const { limit = 50, cursor } = params;

  logger.info({ limit, cursor }, "Starting MUP health check");

  try {
    // Query products with their metafields
    const productsQuery = `#graphql
      query getProducts($first: Int!, $after: String) {
        products(first: $first, after: $after) {
          pageInfo {
            hasNextPage
            endCursor
          }
          edges {
            node {
              id
              title
              handle
              status
              productType
              tags
              variants(first: 10) {
                edges {
                  node {
                    id
                    title
                    sku
                    unitsPerItem: metafield(namespace: "custom", key: "total_units") {
                      id
                      value
                      type
                    }
                    abvPercentage: metafield(namespace: "custom", key: "abv_percentage") {
                      id
                      value
                      type
                    }
                    volumeMl: metafield(namespace: "custom", key: "volume_ml") {
                      id
                      value
                      type
                    }
                  }
                }
              }
            }
          }
        }
      }
    `;

    const response = await shopify.graphql(productsQuery, {
      first: limit,
      after: cursor,
    });

    const products = (response as any)?.products;
    if (!products) {
      throw new Error("Failed to fetch products");
    }

    const healthCheckResults = {
      totalProducts: products.edges.length,
      productsWithCompleteData: 0,
      productsMissingData: 0,
      productsWithPartialData: 0,
      missingDataProducts: [],
      partialDataProducts: [],
      pageInfo: products.pageInfo,
    };

    // Analyze each product
    for (const edge of products.edges) {
      const product = edge.node;
      const variants = product.variants.edges.map((v: any) => v.node);
      
      const productAnalysis = analyzeProduct(product, variants);
      
      if (productAnalysis.status === 'complete') {
        healthCheckResults.productsWithCompleteData++;
      } else if (productAnalysis.status === 'missing') {
        healthCheckResults.productsMissingData++;
        healthCheckResults.missingDataProducts.push(productAnalysis);
      } else if (productAnalysis.status === 'partial') {
        healthCheckResults.productsWithPartialData++;
        healthCheckResults.partialDataProducts.push(productAnalysis);
      }
    }

    logger.info({
      totalProducts: healthCheckResults.totalProducts,
      complete: healthCheckResults.productsWithCompleteData,
      missing: healthCheckResults.productsMissingData,
      partial: healthCheckResults.productsWithPartialData,
    }, "Health check completed");

    return {
      success: true,
      results: healthCheckResults,
    };

  } catch (error) {
    logger.error({ error }, "Health check failed");
    throw new Error(`Health check failed: ${error.message}`);
  }
};

/**
 * Analyze a single product for MUP data completeness
 */
function analyzeProduct(product: any, variants: any[]) {
  const analysis = {
    productId: product.id,
    productTitle: product.title,
    productHandle: product.handle,
    productType: product.productType,
    status: 'complete' as 'complete' | 'missing' | 'partial',
    variants: [],
    issues: [],
    recommendations: [],
  };

  let hasCompleteData = true;
  let hasAnyData = false;

  for (const variant of variants) {
    const variantAnalysis = analyzeVariant(variant);
    analysis.variants.push(variantAnalysis);

    if (variantAnalysis.status === 'missing') {
      hasCompleteData = false;
    } else if (variantAnalysis.status === 'complete') {
      hasAnyData = true;
    } else if (variantAnalysis.status === 'partial') {
      hasCompleteData = false;
      hasAnyData = true;
    }
  }

  // Determine overall product status
  if (hasCompleteData && hasAnyData) {
    analysis.status = 'complete';
  } else if (!hasAnyData) {
    analysis.status = 'missing';
    analysis.issues.push('No alcohol unit data found for any variants');
    analysis.recommendations.push('Add units_per_item metafield or ABV% + volume data');
  } else {
    analysis.status = 'partial';
    analysis.issues.push('Some variants missing alcohol unit data');
    analysis.recommendations.push('Complete missing data for all variants');
  }

  return analysis;
}

/**
 * Analyze a single variant for alcohol unit data
 */
function analyzeVariant(variant: any) {
  const analysis = {
    variantId: variant.id,
    variantTitle: variant.title,
    sku: variant.sku,
    status: 'missing' as 'complete' | 'missing' | 'partial',
    hasUnitsPerItem: false,
    hasABV: false,
    hasVolume: false,
    unitsPerItem: null,
    abvPercentage: null,
    volumeMl: null,
    calculatedUnits: null,
    issues: [],
    recommendations: [],
  };

  // Check for direct total_units metafield (aliased as unitsPerItem)
  if (variant.unitsPerItem?.value) {
    analysis.hasUnitsPerItem = true;
    analysis.unitsPerItem = parseFloat(variant.unitsPerItem.value);
    analysis.status = 'complete';
    return analysis;
  }

  // Check for ABV and volume metafields (aliased)
  if (variant.abvPercentage?.value) {
    analysis.hasABV = true;
    analysis.abvPercentage = parseFloat(variant.abvPercentage.value);
  }

  if (variant.volumeMl?.value) {
    analysis.hasVolume = true;
    analysis.volumeMl = parseFloat(variant.volumeMl.value);
  }

  // Calculate units if we have both ABV and volume
  if (analysis.hasABV && analysis.hasVolume) {
    analysis.calculatedUnits = (analysis.abvPercentage * analysis.volumeMl) / 1000; // ABV% * volume(ml) / 1000
    analysis.status = 'complete';
    analysis.recommendations.push('Consider adding total_units metafield for direct specification');
  } else if (analysis.hasABV || analysis.hasVolume) {
    analysis.status = 'partial';
    analysis.issues.push('Missing ABV% or volume data for unit calculation');
    analysis.recommendations.push('Add both ABV% and volume metafields, or add units_per_item directly');
  } else {
    analysis.status = 'missing';
    analysis.issues.push('No alcohol unit data found');
    analysis.recommendations.push('Add units_per_item metafield or ABV% + volume data');
  }

  return analysis;
}
