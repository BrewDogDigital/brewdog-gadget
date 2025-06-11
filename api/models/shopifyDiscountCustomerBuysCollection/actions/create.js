import { applyParams, preventCrossShopDataAccess, save, ActionOptions, CreateShopifyDiscountCustomerBuysCollectionActionContext } from "gadget-server";

/**
 * @param { CreateShopifyDiscountCustomerBuysCollectionActionContext } context
 */
export async function run({ params, record, logger, api, connections }) {
  applyParams(params, record);
  await preventCrossShopDataAccess(params, record);
  await save(record);
};

/**
 * @param { CreateShopifyDiscountCustomerBuysCollectionActionContext } context
 */
export async function onSuccess({ params, record, logger, api, connections }) {
  // Your logic goes here
};

/** @type { ActionOptions } */
export const options = { actionType: "create" };
