import { applyParams, preventCrossShopDataAccess, save, ActionOptions, UpdateShopifyCompanyContactRoleActionContext } from "gadget-server";

/**
 * @param { UpdateShopifyCompanyContactRoleActionContext } context
 */
export async function run({ params, record, logger, api, connections }) {
  applyParams(params, record);
  await preventCrossShopDataAccess(params, record);
  await save(record);
};

/**
 * @param { UpdateShopifyCompanyContactRoleActionContext } context
 */
export async function onSuccess({ params, record, logger, api, connections }) {
  // Your logic goes here
};

/** @type { ActionOptions } */
export const options = { actionType: "update" };
