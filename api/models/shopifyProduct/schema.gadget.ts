import type { GadgetModel } from "gadget-server";

// This file describes the schema for the "shopifyProduct" model, go to https://brewdog.gadget.app/edit to view/edit your model in Gadget
// For more information on how to update this file http://docs.gadget.dev

export const schema: GadgetModel = {
  type: "gadget/model-schema/v1",
  storageKey: "DataModel-Shopify-Product",
  fields: {},
  shopify: {
    fields: [
      "body",
      "cartLineItems",
      "category",
      "checkoutLineItems",
      "compareAtPriceRange",
      "customerBuysThroughDiscounts",
      "customerGetsThroughDiscounts",
      "handle",
      "orderLineItems",
      "productCategory",
      "productType",
      "publishedAt",
      "shop",
      "shopifyCreatedAt",
      "shopifyUpdatedAt",
      "status",
      "tags",
      "templateSuffix",
      "title",
      "variants",
      "vendor",
    ],
  },
};
