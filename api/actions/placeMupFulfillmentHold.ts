import type { GadgetRecord } from "@gadget-client/brewdog-gadget";

/**
 * Places a fulfillment hold on orders with MUP_NON_COMPLIANCE tag
 * This action is called 1 minute after order creation to give Shopify time to create fulfillment orders
 */
export async function run({ params, logger, api, connections }: any) {
  const { orderId } = params;
  
  if (!orderId) {
    throw new Error("orderId is required");
  }
  
  logger.info({ orderId }, "Attempting to place fulfillment hold on MUP non-compliant order");
  
  // Get the order
  const order = await api.shopifyOrder.findOne(orderId);
  
  if (!order) {
    logger.error({ orderId }, "Order not found");
    return { success: false, error: "Order not found" };
  }
  
  // Check if order has MUP_NON_COMPLIANCE tag
  const hasMupTag = order.tags?.includes("MUP_NON_COMPLIANCE");
  if (!hasMupTag) {
    logger.info({ orderId }, "Order does not have MUP_NON_COMPLIANCE tag, skipping");
    return { success: false, error: "Order does not require MUP hold" };
  }
  
  // Construct shopify GID
  const shopifyGid = order.shopifyId || `gid://shopify/Order/${order.id}`;
  
  try {
    // Query for fulfillment orders
    const fulfillmentOrdersResult = await connections.shopify.current?.graphql(
      `query getFulfillmentOrders($orderId: ID!) {
        order(id: $orderId) {
          fulfillmentOrders(first: 10) {
            edges {
              node {
                id
                status
              }
            }
          }
        }
      }`,
      {
        orderId: shopifyGid
      }
    );
    
    const fulfillmentOrders = fulfillmentOrdersResult?.order?.fulfillmentOrders?.edges || [];
    
    logger.info({ 
      orderId,
      fulfillmentOrdersCount: fulfillmentOrders.length,
      fulfillmentOrders: fulfillmentOrders.map((edge: any) => ({ id: edge.node.id, status: edge.node.status }))
    }, "Found fulfillment orders");
    
    if (fulfillmentOrders.length === 0) {
      logger.warn({ orderId }, "No fulfillment orders found after 1 minute delay - manual hold required");
      return { 
        success: false, 
        error: "No fulfillment orders found",
        requiresManualHold: true
      };
    }
    
    // Place holds on all OPEN fulfillment orders
    const results = [];
    for (const edge of fulfillmentOrders) {
      const fulfillmentOrderId = edge.node.id;
      const status = edge.node.status;
      
      if (status === 'OPEN') {
        const holdResult = await connections.shopify.current?.graphql(
          `mutation fulfillmentOrderHold($id: ID!, $reason: FulfillmentHoldReason!, $reasonNotes: String) {
            fulfillmentOrderHold(id: $id, fulfillmentHold: {reason: $reason, reasonNotes: $reasonNotes}) {
              fulfillmentOrder {
                id
                status
              }
              userErrors {
                field
                message
              }
            }
          }`,
          {
            id: fulfillmentOrderId,
            reason: "AWAITING_PAYMENT",
            reasonNotes: "MUP COMPLIANCE REVIEW REQUIRED: Order flagged for manual MUP verification. Do not fulfill until compliance is confirmed."
          }
        );
        
        if (holdResult?.fulfillmentOrderHold?.userErrors?.length > 0) {
          logger.error({ 
            errors: holdResult.fulfillmentOrderHold.userErrors,
            fulfillmentOrderId
          }, "Failed to place fulfillment order on hold");
          results.push({
            fulfillmentOrderId,
            success: false,
            errors: holdResult.fulfillmentOrderHold.userErrors
          });
        } else {
          logger.info({ 
            fulfillmentOrderId,
            newStatus: holdResult?.fulfillmentOrderHold?.fulfillmentOrder?.status
          }, "Successfully placed fulfillment order on hold");
          results.push({
            fulfillmentOrderId,
            success: true,
            status: holdResult?.fulfillmentOrderHold?.fulfillmentOrder?.status
          });
        }
      } else {
        logger.info({ fulfillmentOrderId, status }, "Skipping fulfillment order (not OPEN)");
        results.push({
          fulfillmentOrderId,
          success: false,
          reason: `Status is ${status}, not OPEN`
        });
      }
    }
    
    const successCount = results.filter(r => r.success).length;
    logger.info({ 
      orderId, 
      totalFulfillmentOrders: fulfillmentOrders.length,
      successfulHolds: successCount
    }, "Completed fulfillment hold placement");
    
    return {
      success: successCount > 0,
      results,
      successCount,
      totalCount: fulfillmentOrders.length
    };
    
  } catch (error) {
    logger.error({ error, orderId }, "Failed to place fulfillment holds");
    return {
      success: false,
      error: error.message
    };
  }
}

export const options = {
  actionType: "custom"
};

