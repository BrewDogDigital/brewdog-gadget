import { preventCrossShopDataAccess, deleteRecord, ActionOptions, DeleteShopifyRefundDutyActionContext } from "gadget-server";

/**
 * @param { DeleteShopifyRefundDutyActionContext } context
 */
export async function run({ params, record, logger, api, connections }) {
  await preventCrossShopDataAccess(params, record);
  await deleteRecord(record);
};

/**
 * @param { DeleteShopifyRefundDutyActionContext } context
 */
export async function onSuccess({ params, record, logger, api, connections }) {
  // Your logic goes here
};

/** @type { ActionOptions } */
export const options = { actionType: "delete" };
