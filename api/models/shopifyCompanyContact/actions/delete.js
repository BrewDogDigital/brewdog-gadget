import { preventCrossShopDataAccess, deleteRecord, ActionOptions, DeleteShopifyCompanyContactActionContext } from "gadget-server";

/**
 * @param { DeleteShopifyCompanyContactActionContext } context
 */
export async function run({ params, record, logger, api, connections }) {
  await preventCrossShopDataAccess(params, record);
  await deleteRecord(record);
};

/**
 * @param { DeleteShopifyCompanyContactActionContext } context
 */
export async function onSuccess({ params, record, logger, api, connections }) {
  // Your logic goes here
};

/** @type { ActionOptions } */
export const options = { actionType: "delete" };
