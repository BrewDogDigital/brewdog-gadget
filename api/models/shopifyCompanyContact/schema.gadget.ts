import type { GadgetModel } from "gadget-server";

// This file describes the schema for the "shopifyCompanyContact" model, go to https://brewdog.gadget.app/edit to view/edit your model in Gadget
// For more information on how to update this file http://docs.gadget.dev

export const schema: GadgetModel = {
  type: "gadget/model-schema/v1",
  storageKey: "DataModel-Shopify-CompanyContact",
  fields: {
    mainContactForCompany: {
      type: "hasOne",
      child: {
        model: "shopifyCompany",
        belongsToField: "mainContact",
      },
      storageKey:
        "ModelField-DataModel-Shopify-CompanyContact-EvYICf49Cm3t::FieldStorageEpoch-DataModel-Shopify-CompanyContact-Kbbpx-FE20Jc-initial",
    },
  },
  shopify: {
    fields: [
      "company",
      "customer",
      "isMainContact",
      "lifetimeDuration",
      "locale",
      "orders",
      "roleAssignments",
      "shop",
      "shopifyCreatedAt",
      "shopifyUpdatedAt",
      "title",
    ],
  },
};
