import type { GadgetModel } from "gadget-server";

// This file describes the schema for the "shopifyCustomer" model, go to https://brewdog.gadget.app/edit to view/edit your model in Gadget
// For more information on how to update this file http://docs.gadget.dev

export const schema: GadgetModel = {
  type: "gadget/model-schema/v1",
  storageKey: "DataModel-Shopify-Customer",
  fields: {},
  shopify: {
    fields: [
      "acceptsMarketing",
      "acceptsMarketingUpdatedAt",
      "addresses",
      "checkouts",
      "companyContacts",
      "currency",
      "defaultAddress",
      "email",
      "emailMarketingConsent",
      "firstName",
      "giftCards",
      "lastName",
      "lastOrder",
      "lastOrderName",
      "marketingOptInLevel",
      "mergeable",
      "metafield",
      "multipassIdentifier",
      "note",
      "orders",
      "ordersCount",
      "phone",
      "shop",
      "shopifyCreatedAt",
      "shopifyState",
      "shopifyUpdatedAt",
      "smsMarketingConsent",
      "statistics",
      "tags",
      "taxExempt",
      "taxExemptions",
      "totalSpent",
      "verifiedEmail",
    ],
  },
};
