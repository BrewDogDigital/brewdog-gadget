import { globalShopifySync, ActionOptions, ScheduledShopifySyncGlobalActionContext } from "gadget-server";

const HourInMs = 60 * 60 * 1000;

/**
 * @param { ScheduledShopifySyncGlobalActionContext } context
 */
export async function run({ params, logger, api, connections }) {
  const syncOnlyModels = connections.shopify.enabledModels
    .filter(model => model.syncOnly)
    .map(model => model.apiIdentifier);

  const syncSince = new Date(Date.now() - 25 * HourInMs)

  await globalShopifySync({
    apiKeys: connections.shopify.apiKeys,
    syncSince,
    models: syncOnlyModels
  });
};

/** @type { ActionOptions } */
export const options = {
  triggers: {
    scheduler: [
      {
        every: "day",
        at: "01:48 UTC"
      }
    ]
  }
};
