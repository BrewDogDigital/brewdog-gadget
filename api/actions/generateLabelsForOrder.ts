import { GenerateLabelsForOrderGlobalActionContext } from "gadget-server";
import generateLabel from "../lib/generateLabel";
import { getLabelSku, isValidPropertyArray } from "../lib/helpers";

export const params = {
  id: { type: "string" }
};

interface IGenerateLabelsForOrderGlobalActionContext extends GenerateLabelsForOrderGlobalActionContext {
  params: {
    id: string
  }
}

/**
 * @param { GenerateLabelsForOrderGlobalActionContext } context
 */
export async function run({ params, logger, api, connections }: IGenerateLabelsForOrderGlobalActionContext) {

  const fullOrder = await api.shopifyOrder.findOne(params.id, {
    select: {
      id: true,
      name: true,
      lineItems: {
        edges: {
          node: {
            id: true,
            properties: true,
            sku: true
          }
        }
      }
    }
  })

  logger.info({ fullOrder }, "Full Order - generateLabelsForOrder")

  const lineItems = fullOrder.lineItems.edges || [];



  for (const item of lineItems) {
    logger.info({ item }, "Line Item")
    if (item.node.properties) {

      if (!isValidPropertyArray(item.node.properties)) {
        logger.info("NO PROPERTIES - skipping")
        continue;
      }
      let uuid: string | null = null
      let lableSku: string | null = null
      for (const property of item.node.properties) {
        
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
        continue
      }
                

      // Call the external API to generate the label
      const response = await generateLabel(uuid, Number(fullOrder.name?.replace("#", "")), lableSku, logger);
      logger.info({ response }, "Response from generateLabel")
      continue
    }
  }
};

