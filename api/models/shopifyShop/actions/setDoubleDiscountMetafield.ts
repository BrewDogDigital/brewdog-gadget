import { applyParams, save, ActionOptions, SetDoubleDiscountMetafieldShopifyShopActionContext } from "gadget-server";
import { preventCrossShopDataAccess } from "gadget-server/shopify";

/**
 * @param { SetDoubleDiscountMetafieldShopifyShopActionContext } context
 */
export async function run({ params, record, logger, api, connections }) {
  applyParams(params, record);
  await preventCrossShopDataAccess(params, record);
  await save(record);

  const { doubleDiscount } = params;
  logger.info({ doubleDiscount }, "double discount");

  const response = await connections.shopify.current?.graphql(
    `mutation ($metafields: [MetafieldsSetInput!]!) {
      metafieldsSet(metafields: $metafields) {
        metafields {
          key
          namespace
          value
        }
        userErrors {
          message
        }
      }
    }`,
    {
      metafields: [
        {
          key: "efp_double_discount",
          namespace: "brewdog",
          ownerId: `gid://shopify/Shop/${record.id}`,
          type: "boolean",
          value: doubleDiscount ? "true" : "false",
        },
      ],
    }
  );

  logger.info({ response }, "add metafields response");

  // get the record again
  record.doubleDiscount = doubleDiscount;
  return record;

};

/**
 * @param { SetDoubleDiscountMetafieldShopifyShopActionContext } context
 */
export async function onSuccess({ params, record, logger, api, connections }) {
  // Your logic goes here
};

/** @type { ActionOptions } */
export const options = {
  actionType: "update",
  triggers: {
    api: true,
  },
};

export const params = {
  doubleDiscount: { type: "boolean", required: true },
};