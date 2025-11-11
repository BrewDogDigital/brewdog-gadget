import { applyParams, preventCrossShopDataAccess, save, ActionOptions, UpdateShopifyOrderActionContext } from "gadget-server";

/**
 * @param { UpdateShopifyOrderActionContext } context
 */
export async function run({ params, record, logger, api, connections }) {
  applyParams(params, record);
  await preventCrossShopDataAccess(params, record);
  await save(record);
};

/**
 * @param { UpdateShopifyOrderActionContext } context
 */
export async function onSuccess({ params, record, logger, api, connections }) {
  // Check if this order has MUP_NON_COMPLIANCE tag and needs fulfillment hold
  const hasMupTag = record.tags?.includes("MUP_NON_COMPLIANCE");
  const hasHoldAttemptedTag = record.tags?.includes("MUP_HOLD_ATTEMPTED");
  
  if (hasMupTag && !hasHoldAttemptedTag) {
    logger.info({ 
      orderId: record.id 
    }, "Order has MUP_NON_COMPLIANCE tag - attempting to place fulfillment hold");
    
    try {
      // Construct shopify GID
      const shopifyGid = record.shopifyId || `gid://shopify/Order/${record.id}`;
      
      // Query for fulfillment orders directly here
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
        orderId: record.id,
        fulfillmentOrdersCount: fulfillmentOrders.length,
        fulfillmentOrders: fulfillmentOrders.map((edge) => ({ id: edge.node.id, status: edge.node.status }))
      }, "Found fulfillment orders on order update");
      
      if (fulfillmentOrders.length === 0) {
        logger.warn({ orderId: record.id }, "No fulfillment orders found on order update - manual hold required");
        return;
      }
      
      // Place holds on all OPEN fulfillment orders
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
              reason: "OTHER",
              reasonNotes: "MUP COMPLIANCE REVIEW REQUIRED: Order flagged for manual MUP verification. Do not fulfill until compliance is confirmed."
            }
          );
          
          if (holdResult?.fulfillmentOrderHold?.userErrors?.length > 0) {
            logger.error({ 
              errors: holdResult.fulfillmentOrderHold.userErrors,
              fulfillmentOrderId
            }, "Failed to place fulfillment order on hold");
          } else {
            logger.info({ 
              fulfillmentOrderId,
              newStatus: holdResult?.fulfillmentOrderHold?.fulfillmentOrder?.status
            }, "Successfully placed fulfillment order on hold");
          }
        } else {
          logger.info({ fulfillmentOrderId, status }, "Skipping fulfillment order (not OPEN)");
        }
      }
      
      // Add tag to prevent repeated attempts
      await api.internal.shopifyOrder.update(record.id, {
        shopifyOrder: {
          tags: [...(record.tags || []), "MUP_HOLD_ATTEMPTED"]
        }
      });
      
      logger.info({ orderId: record.id }, "Fulfillment hold placement completed");
    } catch (error) {
      logger.error({ 
        error, 
        orderId: record.id 
      }, "Failed to place fulfillment hold on order update");
    }
  }
};

/** @type { ActionOptions } */
export const options = { actionType: "update" };
