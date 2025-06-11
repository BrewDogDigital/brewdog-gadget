import { preventCrossShopDataAccess, deleteRecord, ActionOptions, DeleteShopifyCompanyContactRoleActionContext } from "gadget-server";

/**
 * @param { DeleteShopifyCompanyContactRoleActionContext } context
 */
export async function run({ params, record, logger, api, connections }) {
  await preventCrossShopDataAccess(params, record);
  await deleteRecord(record);
};

/**
 * @param { DeleteShopifyCompanyContactRoleActionContext } context
 */
export async function onSuccess({ params, record, logger, api, connections }) {
  // Your logic goes here
};

/** @type { ActionOptions } */
export const options = { actionType: "delete" };
