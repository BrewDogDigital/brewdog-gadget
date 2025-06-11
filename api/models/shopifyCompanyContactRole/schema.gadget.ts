import type { GadgetModel } from "gadget-server";

// This file describes the schema for the "shopifyCompanyContactRole" model, go to https://brewdog.gadget.app/edit to view/edit your model in Gadget
// For more information on how to update this file http://docs.gadget.dev

export const schema: GadgetModel = {
  type: "gadget/model-schema/v1",
  storageKey: "DataModel-Shopify-CompanyContactRole",
  fields: {
    defaultRoleForCompany: {
      type: "hasOne",
      child: {
        model: "shopifyCompany",
        belongsToField: "defaultRole",
      },
      storageKey:
        "ModelField-DataModel-Shopify-CompanyContactRole-MwVeqk9Epwbx::FieldStorageEpoch-DataModel-Shopify-CompanyContactRole-1-k4N1wa3Ls6-initial",
    },
    roleAssignment: {
      type: "hasOne",
      child: {
        model: "shopifyCompanyContactRoleAssignment",
        belongsToField: "role",
      },
      storageKey:
        "ModelField-DataModel-Shopify-CompanyContactRole-dKsUWLtfSX8J::FieldStorageEpoch-DataModel-Shopify-CompanyContactRole-ZRdSKpy2Xgfm-initial",
    },
  },
  shopify: { fields: ["company", "name", "note", "shop"] },
};
