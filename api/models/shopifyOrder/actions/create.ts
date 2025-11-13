import { applyParams, preventCrossShopDataAccess, save, ActionOptions, CreateShopifyOrderActionContext, Logger, DefaultEmailTemplates } from "gadget-server";
import generateLabel from "../../../lib/generateLabel";
import { isValidPropertyArray } from "../../../lib/helpers";
import { getLabelSku } from "../../../lib/helpers";
/**
 * @param { CreateShopifyOrderActionContext } context
 */
export async function run({ params, record, logger, api, connections }) {
  applyParams(params, record);
  await preventCrossShopDataAccess(params, record);
  await save(record);
};

/**
 * @param { CreateShopifyOrderActionContext } context
 */
/**
 * Check if a postcode is Scottish
 */
function isScottishPostcode(postcode: string | null | undefined): boolean {
  if (!postcode) return false;
  
  const normalized = postcode.trim().toUpperCase().replace(/\s+/g, '');
  
  const scottishPrefixes = [
    'AB', 'DD', 'DG', 'EH', 'FK', 'G', 
    'HS', 'IV', 'KA', 'KW', 'KY', 'ML', 
    'PA', 'PH', 'TD', 'ZE'
  ];
  
  return scottishPrefixes.some(prefix => normalized.startsWith(prefix));
}

export async function onSuccess({ params, record, logger, api, connections, emails }) {
  
  // ========================================
  // MUP COMPLIANCE CHECK
  // ========================================
  logger.info("Checking MUP compliance for order...");
  
  // First, check if MUP enforcement is enabled
  let enforcementEnabled = false;
  try {
    const shopify = connections.shopify.current;
    if (shopify) {
      const shopQuery = `#graphql
        query {
          shop {
            enforcementEnabled: metafield(namespace: "custom", key: "mup_enforcement_enabled") {
              value
            }
          }
        }
      `;
      
      const response = await shopify.graphql(shopQuery);
      const shop = (response as any)?.shop;
      enforcementEnabled = shop?.enforcementEnabled?.value === "true";
      
      logger.info({ enforcementEnabled }, "MUP enforcement status");
    }
  } catch (error) {
    logger.error({ error }, "Failed to check MUP enforcement status, defaulting to disabled");
    enforcementEnabled = false;
  }
  
  // Skip MUP compliance check if enforcement is disabled
  if (!enforcementEnabled) {
    logger.info("MUP enforcement is disabled - skipping compliance check");
    // Continue to existing code below
  } else {
    logger.info("MUP enforcement is enabled - performing compliance check");
  
    const billingPostcode = record.billingAddress?.zip;
    const shippingPostcode = record.shippingAddress?.zip;
    const orderNoteAttributes = record.noteAttributes || [];
    
    // Find uk_region attribute from cart
    const ukRegionAttribute = orderNoteAttributes.find((attr: any) => attr.name === 'uk_region');
    const ukRegion = ukRegionAttribute?.value;
    
    logger.info({ 
      billingPostcode, 
      shippingPostcode, 
      ukRegion 
    }, "MUP check data");
    
    const isBillingScottish = isScottishPostcode(billingPostcode);
    const isShippingScottish = isScottishPostcode(shippingPostcode);
    
    logger.info({
      isBillingScottish,
      isShippingScottish,
      ukRegion
    }, "Scottish address detection");
    
    // Check for non-compliance: Scottish billing address but region not set to Scotland
    if (isBillingScottish && ukRegion !== 'scotland') {
      logger.warn({
        orderId: record.id,
        orderName: record.name,
        orderShopifyId: record.shopifyId,
        billingPostcode,
        shippingPostcode,
        ukRegion
      }, "MUP NON-COMPLIANCE DETECTED: Scottish billing address but uk_region != scotland");
      
      try {
        const complianceNote = `MUP COMPLIANCE REVIEW REQUIRED: Scottish billing address (${billingPostcode}) detected but customer did not select Scotland region (selected: ${ukRegion || 'none'}). Manual review needed before fulfillment.`;
        
        // Construct shopifyId GID if not available (format: gid://shopify/Order/{numeric_id})
        const shopifyGid = record.shopifyId || `gid://shopify/Order/${record.id}`;
        
        logger.info({ 
          orderId: record.id, 
          shopifyId: record.shopifyId,
          shopifyGid: shopifyGid,
          currentTags: record.tags 
        }, "Updating order in Shopify with tags, note, and hold status...");
        
        // Combine existing tags with new compliance tags
        const currentTags = Array.isArray(record.tags) ? record.tags : [];
        const newTags = [...currentTags, "MUP_ENFORCED", "MUP_NON_COMPLIANCE"];
        const tagsString = newTags.join(', ');
        
        logger.info({ 
          currentTags, 
          newTags, 
          tagsString 
        }, "Tags to apply to order");
        
        // First, update tags and note
        const updateResult = await connections.shopify.current?.graphql(
          `mutation orderUpdate($input: OrderInput!) {
            orderUpdate(input: $input) {
              order {
                id
                tags
                note
              }
              userErrors {
                field
                message
              }
            }
          }`,
          {
            input: {
              id: shopifyGid,
              tags: tagsString,
              note: complianceNote
            }
          }
        );
        
        if (updateResult?.orderUpdate?.userErrors?.length > 0) {
          logger.error({ 
            errors: updateResult.orderUpdate.userErrors, 
            orderId: record.id 
          }, "Shopify returned errors when updating order");
        } else {
          logger.info({ 
            orderId: record.id,
            tags: updateResult?.orderUpdate?.order?.tags,
            note: updateResult?.orderUpdate?.order?.note
          }, "Successfully updated order in Shopify with tags and note");
        }
        
        // Schedule fulfillment hold placement after 1 minute
        // Fulfillment orders are created asynchronously by Shopify, so we delay the hold placement
        try {
          logger.info({ 
            orderId: record.id
          }, "Scheduling fulfillment hold placement in 1 minute (allows Shopify time to create fulfillment orders)");
          
          // Use setTimeout to schedule the action call after 60 seconds
          setTimeout(async () => {
            try {
              await api.placeMupFulfillmentHold({ orderId: record.id });
            } catch (scheduleError) {
              logger.error({ 
                error: scheduleError, 
                orderId: record.id 
              }, "Failed to execute scheduled fulfillment hold placement");
            }
          }, 60000); // 60 seconds = 1 minute
          
          logger.info({ 
            orderId: record.id
          }, "Fulfillment hold placement scheduled successfully");
          
        } catch (scheduleError) {
          logger.error({ error: scheduleError, orderId: record.id }, "Failed to schedule fulfillment hold placement");
        }
        
        // Send email to customer service
        const emailTemplate = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>MUP Compliance Review Required</title>
        </head>
        <body style="font-family: Arial, sans-serif; background-color: #f7f7f7; margin: 0; padding: 20px;">
          <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <h1 style="color: #d32f2f; font-size: 24px; margin-bottom: 20px; border-bottom: 3px solid #d32f2f; padding-bottom: 10px;">
              MUP Compliance Review Required
            </h1>
            
            <div style="background-color: #fff3cd; border-left: 4px solid #ff9800; padding: 15px; margin-bottom: 20px;">
              <p style="margin: 0; color: #856404; font-weight: bold;">
                Action Required: Manual review needed before fulfillment
              </p>
            </div>
            
            <h2 style="font-size: 18px; color: #333; margin-top: 25px;">Order Details</h2>
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
              <tr style="border-bottom: 1px solid #eee;">
                <td style="padding: 10px 0; font-weight: bold; color: #555;">Order Number:</td>
                <td style="padding: 10px 0; color: #333;"><%= orderName %></td>
              </tr>
              <tr style="border-bottom: 1px solid #eee;">
                <td style="padding: 10px 0; font-weight: bold; color: #555;">Order ID:</td>
                <td style="padding: 10px 0; color: #333; font-family: monospace; font-size: 12px;"><%= orderId %></td>
              </tr>
              <tr style="border-bottom: 1px solid #eee;">
                <td style="padding: 10px 0; font-weight: bold; color: #555;">Customer Email:</td>
                <td style="padding: 10px 0; color: #333;"><%= customerEmail %></td>
              </tr>
            </table>
            
            <h2 style="font-size: 18px; color: #333; margin-top: 25px;">Issue Detected</h2>
            <div style="background-color: #f5f5f5; padding: 15px; border-radius: 4px; margin-bottom: 20px;">
              <p style="margin: 0 0 10px 0; color: #333; line-height: 1.6;">
                <strong>Scottish billing address detected:</strong> <%= billingPostcode %>
              </p>
              <p style="margin: 0 0 10px 0; color: #333; line-height: 1.6;">
                <strong>Shipping address:</strong> <%= shippingPostcode %>
              </p>
              <p style="margin: 0; color: #333; line-height: 1.6;">
                <strong>Selected region:</strong> <%= ukRegion || 'Not set' %>
              </p>
            </div>
            
            <div style="background-color: #e3f2fd; border-left: 4px solid #2196f3; padding: 15px; margin-bottom: 20px;">
              <p style="margin: 0 0 10px 0; color: #0d47a1; font-weight: bold;">Why This Requires Review:</p>
              <p style="margin: 0; color: #1565c0; line-height: 1.6;">
                Customer has a Scottish billing address but did not select "Scotland" as their region during checkout. 
                MUP (Minimum Unit Pricing) charges may not have been applied correctly.
              </p>
            </div>
            
            <div style="background-color: #fff3cd; border-left: 4px solid #ff9800; padding: 15px; margin-bottom: 20px;">
              <p style="margin: 0; color: #856404; font-weight: bold;">
                Fulfillment hold will be automatically placed in 1 minute
              </p>
              <p style="margin: 5px 0 0 0; color: #856404; font-size: 14px;">
                If hold is not applied automatically, you must place it manually before fulfillment
              </p>
            </div>
            
            <h2 style="font-size: 18px; color: #333; margin-top: 25px;">Action Required</h2>
            <ol style="color: #333; line-height: 1.8; padding-left: 20px;">
              <li>Review the order in Shopify Admin</li>
              <li>Verify if MUP charges were applied correctly</li>
              <li>Confirm fulfillment hold was automatically applied (check fulfillment status)</li>
              <li>If MUP is missing, calculate and add the levy before fulfillment</li>
              <li>Contact customer if additional payment is required</li>
              <li>Release the fulfillment hold once MUP is resolved</li>
              <li>Remove the <code style="background-color: #f5f5f5; padding: 2px 6px; border-radius: 3px;">MUP_NON_COMPLIANCE</code> and <code style="background-color: #f5f5f5; padding: 2px 6px; border-radius: 3px;">MUP_ENFORCED</code> tags once resolved</li>
            </ol>
            
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
              <a href="<%= orderUrl %>" 
                 style="display: inline-block; background-color: #2196f3; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 4px; font-weight: bold;">
                View Order in Shopify Admin
              </a>
            </div>
            
            <div style="margin-top: 30px; padding: 15px; background-color: #f5f5f5; border-radius: 4px; font-size: 12px; color: #666;">
              <p style="margin: 0 0 5px 0;"><strong>Note:</strong> This email was automatically generated by the MUP compliance system.</p>
              <p style="margin: 0;">For questions about MUP enforcement, refer to the compliance documentation.</p>
            </div>
          </div>
        </body>
        </html>
        `;
        
        try {
          // Get shop data with all available fields for debugging
          const shopRecord = await api.shopifyShop.findOne(record.shopId);
          
          logger.info({ 
            shopId: record.shopId,
            myshopifyDomain: shopRecord?.myshopifyDomain,
            domain: shopRecord?.domain,
            shopName: shopRecord?.name
          }, "Shop data for order URL");
          
          // Use the myshopifyDomain field which is the permanent admin domain (e.g., brewdog-dev.myshopify.com)
          const shopDomain = shopRecord?.myshopifyDomain || shopRecord?.domain || 'brewdog-dev.myshopify.com';
          // Use numeric ID if shopifyId GID isn't available yet
          const orderId = record.shopifyId ? record.shopifyId.split('/').pop() : record.id;
          const orderUrl = `https://${shopDomain}/admin/orders/${orderId}`;
          
          logger.info({ shopDomain, orderId, orderUrl }, "Constructed order URL");
        
          const emailTo = process.env.MUP_COMPLIANCE_EMAIL || "hello@brewdog.com";
          
          await emails.sendMail({
            to: emailTo,
            subject: `MUP Compliance Review Required - Order ${record.name}`,
            html: DefaultEmailTemplates.renderEmailTemplate(emailTemplate, {
              orderName: record.name || 'Unknown',
              orderId: record.id,
              customerEmail: record.email || 'Not provided',
              billingPostcode: billingPostcode,
              shippingPostcode: shippingPostcode || 'Not provided',
              ukRegion: ukRegion,
              orderUrl: orderUrl
            }),
          });
          
          logger.info({ orderId: record.id, to: process.env.MUP_COMPLIANCE_EMAIL }, "Sent MUP compliance email to customer service");
        } catch (emailError) {
          logger.error({ error: emailError, orderId: record.id }, "Failed to send MUP compliance email");
          // Don't throw - we still want the order to be created with the tag and note
        }
        
      } catch (error) {
        logger.error({ error, orderId: record.id }, "Failed to process MUP non-compliance");
      }
    } else {
      logger.info("Order passes MUP compliance check");
    }
  }
  
  // ========================================
  // EXISTING CODE BELOW
  // ========================================
  
  // const fullOrder = await api.shopifyOrder.findOne(params.id, {
  //   select: {
  //     id: true,
  //     name: true,
  //     lineItems: {
  //       edges: {
  //         node: {
  //           id: true,
  //           properties: true,
  //           sku: true
  //         }
  //       }
  //     }
  //   }
  // })

  // logger.info({ fullOrder }, "Full Order - generateLabelsForOrder")

  // const lineItems = fullOrder.lineItems.edges || [];



  // for (const item of lineItems) {
  //   logger.info({ item }, "Line Item")
  //   if (item.node.properties) {

  //     if (!isValidPropertyArray(item.node.properties)) {
  //       logger.info("NO PROPERTIES - skipping")
  //       continue;
  //     }
  //     let uuid: string | null = null
  //     let lableSku: string | null = null
  //     for (const property of item.node.properties) {
        
  //       if (property.name === "_uuid") {

  //         logger.info("FOUND UUID")
  //         uuid = property.value
  //         logger.info({ uuid }, "UUID")
  //         continue
  //       }

  //       if (property.name === "_document_id") {
  //         logger.info("FOUND DOCUMENT ID")
  //         lableSku = getLabelSku(property.value)
  //         logger.info({ lableSku }, "Label SKU")
  //         continue
  //       }
  //     }

  //     if (!uuid || !lableSku) {
  //       logger.info("UUID or SKU not found - skipping")
  //       continue
  //     }
                

  //     // Call the external API to generate the label
  //     const response = await generateLabel(uuid, Number(fullOrder.name?.replace("#", "")), lableSku, logger);
  //     logger.info({ response }, "Response from generateLabel")
  //     continue
  //   }
  // }
}

/** @type { ActionOptions } */
export const options = { actionType: "create" };
