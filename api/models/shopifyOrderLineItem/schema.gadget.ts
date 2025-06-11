import type { GadgetModel } from "gadget-server";

// This file describes the schema for the "shopifyOrderLineItem" model, go to https://brewdog.gadget.app/edit to view/edit your model in Gadget
// For more information on how to update this file http://docs.gadget.dev

export const schema: GadgetModel = {
  type: "gadget/model-schema/v1",
  storageKey: "DataModel-Shopify-OrderLineItem",
  fields: {},
  shopify: {
    fields: [
      "attributedStaffs",
      "currentQuantity",
      "discountAllocations",
      "duties",
      "fulfillableQuantity",
      "fulfillmentLineItems",
      "fulfillmentService",
      "fulfillmentStatus",
      "giftCard",
      "grams",
      "name",
      "order",
      "price",
      "priceSet",
      "product",
      "productExists",
      "properties",
      "quantity",
      "refunds",
      "requiresShipping",
      "shop",
      "shopifyCreatedAt",
      "shopifyUpdatedAt",
      "sku",
      "taxLines",
      "taxable",
      "title",
      "totalDiscount",
      "totalDiscountSet",
      "variant",
      "variantInventoryManagement",
      "variantTitle",
      "vendor",
    ],
  },
};
