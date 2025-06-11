import type { GadgetModel } from "gadget-server";

// This file describes the schema for the "shopifyDuty" model, go to https://brewdog.gadget.app/edit to view/edit your model in Gadget
// For more information on how to update this file http://docs.gadget.dev

export const schema: GadgetModel = {
  type: "gadget/model-schema/v1",
  storageKey: "DataModel-Shopify-Duty",
  fields: {
    refundDuty: {
      type: "hasOne",
      child: {
        model: "shopifyRefundDuty",
        belongsToField: "originalDuty",
      },
      storageKey:
        "ModelField-DataModel-Shopify-Duty-cL0V-a7c-m55::FieldStorageEpoch-DataModel-Shopify-Duty-ZdhVCCuX_G4V-initial",
    },
  },
  shopify: {
    fields: [
      "countryCodeOfOrigin",
      "harmonizedSystemCode",
      "orderLineItem",
      "presentmentMoney",
      "shop",
      "shopMoney",
      "taxLines",
    ],
  },
};
