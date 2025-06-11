import { preventCrossShopDataAccess, deleteRecord, ActionOptions, DeleteShopifyOrderAdjustmentActionContext } from "gadget-server";

/**
 * @param { DeleteShopifyOrderAdjustmentActionContext } context
 */
export async function run({ params, record, logger, api, connections }) {
  await preventCrossShopDataAccess(params, record);
  await deleteRecord(record);
};

/**
 * @param { DeleteShopifyOrderAdjustmentActionContext } context
 */
export async function onSuccess({ params, record, logger, api, connections }) {
  // Your logic goes here
};

/** @type { ActionOptions } */
export const options = { actionType: "delete" };
