import { applyParams, preventCrossShopDataAccess, save, ActionOptions, CreateShopifyOrderLineItemActionContext } from "gadget-server";
import { getLabelSku, isValidPropertyArray } from "../../../lib/helpers";
import generateLabel from "../../../lib/generateLabel";

/**
 * @param { CreateShopifyOrderLineItemActionContext } context
 */
export async function run({ params, record, logger, api, connections }) {
  applyParams(params, record);
  await preventCrossShopDataAccess(params, record);
  await save(record);
};

/**
 * @param { CreateShopifyOrderLineItemActionContext } context
 */
export async function onSuccess({ params, record, logger, api, connections }: CreateShopifyOrderLineItemActionContext) {
    logger.info({ record }, "Line Item")
    if (record.properties) {

      if (!isValidPropertyArray(record.properties)) {
        logger.info("NO PROPERTIES - skipping")
        return;
      }
      let uuid: string | null = null
      let lableSku: string | null = null
      for (const property of record.properties) {
        
        if (property.name === "_uuid") {

          logger.info("FOUND UUID")
          uuid = property.value
          logger.info({ uuid }, "UUID")
          continue
        }

        if (property.name === "_document_id") {
          logger.info("FOUND DOCUMENT ID")
          lableSku = getLabelSku(property.value)
          logger.info({ lableSku }, "Label SKU")
          continue
        }
      }

      if (!uuid || !lableSku) {
        logger.info("UUID or SKU not found - skipping")
        return
      }

      // get the full line item with order name
      const lineItem = await api.shopifyOrderLineItem.findOne(record.id, {
        select: {
          order: {
            name: true
          }
        }
      })

      if (!lineItem) {
        logger.info("Line Item not found - skipping")
        return
      }
                

      // Call the external API to generate the label
      const response = await generateLabel(uuid, Number(lineItem?.order?.name?.replace("#", "")), lableSku, logger);
      logger.info({ response }, "Response from generateLabel")
    }
};

/** @type { ActionOptions } */
export const options = { actionType: "create" };
