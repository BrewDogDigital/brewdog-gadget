import type { GadgetModel } from "gadget-server";

// This file describes the schema for the "shopifyTenderTransaction" model, go to https://brewdog.gadget.app/edit to view/edit your model in Gadget
// For more information on how to update this file http://docs.gadget.dev

export const schema: GadgetModel = {
  type: "gadget/model-schema/v1",
  storageKey: "DataModel-Shopify-TenderTransaction",
  fields: {},
  shopify: {
    fields: [
      "amount",
      "currency",
      "order",
      "paymentDetails",
      "paymentMethod",
      "processedAt",
      "remoteReference",
      "shop",
      "test",
    ],
  },
};
