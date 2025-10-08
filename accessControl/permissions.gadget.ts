import type { GadgetPermissions } from "gadget-server";

/**
 * This metadata describes the access control configuration available in your application.
 * Grants that are not defined here are set to false by default.
 *
 * View and edit your roles and permissions in the Gadget editor at https://brewdog.gadget.app/edit/settings/permissions
 */
export const permissions: GadgetPermissions = {
  type: "gadget/permissions/v1",
  roles: {
    "shopify-app-users": {
      storageKey: "Role-Shopify-App",
      models: {
        shopifyBillingAddress: {
          read: {
            filter:
              "accessControl/filters/shopify/shopifyBillingAddress.gelly",
          },
          actions: {
            create: true,
            delete: true,
            update: true,
          },
        },
        shopifyCart: {
          read: {
            filter: "accessControl/filters/shopify/shopifyCart.gelly",
          },
          actions: {
            create: true,
            update: true,
          },
        },
        shopifyCartLineItem: {
          read: {
            filter:
              "accessControl/filters/shopify/shopifyCartLineItem.gelly",
          },
          actions: {
            create: true,
            delete: true,
            update: true,
          },
        },
        shopifyCheckout: {
          read: {
            filter:
              "accessControl/filters/shopify/shopifyCheckout.gelly",
          },
          actions: {
            create: true,
            delete: true,
            update: true,
          },
        },
        shopifyCheckoutAppliedGiftCard: {
          read: {
            filter:
              "accessControl/filters/shopify/shopifyCheckoutAppliedGiftCard.gelly",
          },
          actions: {
            create: true,
            delete: true,
            update: true,
          },
        },
        shopifyCheckoutLineItem: {
          read: {
            filter:
              "accessControl/filters/shopify/shopifyCheckoutLineItem.gelly",
          },
          actions: {
            create: true,
            delete: true,
            update: true,
          },
        },
        shopifyCheckoutShippingRate: {
          read: {
            filter:
              "accessControl/filters/shopify/shopifyCheckoutShippingRate.gelly",
          },
          actions: {
            create: true,
            delete: true,
            update: true,
          },
        },
        shopifyCollection: {
          read: {
            filter:
              "accessControl/filters/shopify/shopifyCollection.gelly",
          },
        },
        shopifyCompany: {
          read: {
            filter:
              "accessControl/filters/shopify/shopifyCompany.gelly",
          },
          actions: {
            create: true,
            delete: true,
            update: true,
          },
        },
        shopifyCompanyAddress: {
          read: {
            filter:
              "accessControl/filters/shopify/shopifyCompanyAddress.gelly",
          },
          actions: {
            create: true,
            delete: true,
            update: true,
          },
        },
        shopifyCompanyContact: {
          read: {
            filter:
              "accessControl/filters/shopify/shopifyCompanyContact.gelly",
          },
          actions: {
            create: true,
            delete: true,
            update: true,
          },
        },
        shopifyCompanyContactRole: {
          read: {
            filter:
              "accessControl/filters/shopify/shopifyCompanyContactRole.gelly",
          },
          actions: {
            create: true,
            delete: true,
            update: true,
          },
        },
        shopifyCompanyContactRoleAssignment: {
          read: {
            filter:
              "accessControl/filters/shopify/shopifyCompanyContactRoleAssignment.gelly",
          },
          actions: {
            create: true,
            delete: true,
            update: true,
          },
        },
        shopifyCompanyLocation: {
          read: {
            filter:
              "accessControl/filters/shopify/shopifyCompanyLocation.gelly",
          },
          actions: {
            create: true,
            delete: true,
            update: true,
          },
        },
        shopifyCustomer: {
          read: {
            filter:
              "accessControl/filters/shopify/shopifyCustomer.gelly",
          },
          actions: {
            create: true,
            delete: true,
            update: true,
          },
        },
        shopifyCustomerAddress: {
          read: {
            filter:
              "accessControl/filters/shopify/shopifyCustomerAddress.gelly",
          },
          actions: {
            create: true,
            delete: true,
            update: true,
          },
        },
        shopifyCustomerMergeable: {
          read: {
            filter:
              "accessControl/filters/shopify/shopifyCustomerMergeable.gelly",
          },
          actions: {
            create: true,
            delete: true,
            update: true,
          },
        },
        shopifyDiscount: {
          read: {
            filter:
              "accessControl/filters/shopify/shopifyDiscount.gelly",
          },
          actions: {
            create: true,
            delete: true,
            update: true,
          },
        },
        shopifyDiscountCode: {
          read: {
            filter:
              "accessControl/filters/shopify/shopifyDiscountCode.gelly",
          },
          actions: {
            create: true,
            delete: true,
            update: true,
          },
        },
        shopifyDiscountCustomerBuysCollection: {
          read: {
            filter:
              "accessControl/filters/shopify/shopifyDiscountCustomerBuysCollection.gelly",
          },
          actions: {
            create: true,
            delete: true,
            update: true,
          },
        },
        shopifyDiscountCustomerBuysProduct: {
          read: {
            filter:
              "accessControl/filters/shopify/shopifyDiscountCustomerBuysProduct.gelly",
          },
          actions: {
            create: true,
            delete: true,
            update: true,
          },
        },
        shopifyDiscountCustomerBuysProductVariant: {
          read: {
            filter:
              "accessControl/filters/shopify/shopifyDiscountCustomerBuysProductVariant.gelly",
          },
          actions: {
            create: true,
            delete: true,
            update: true,
          },
        },
        shopifyDiscountCustomerGetsCollection: {
          read: {
            filter:
              "accessControl/filters/shopify/shopifyDiscountCustomerGetsCollection.gelly",
          },
          actions: {
            create: true,
            delete: true,
            update: true,
          },
        },
        shopifyDiscountCustomerGetsProduct: {
          read: {
            filter:
              "accessControl/filters/shopify/shopifyDiscountCustomerGetsProduct.gelly",
          },
          actions: {
            create: true,
            delete: true,
            update: true,
          },
        },
        shopifyDiscountCustomerGetsProductVariant: {
          read: {
            filter:
              "accessControl/filters/shopify/shopifyDiscountCustomerGetsProductVariant.gelly",
          },
          actions: {
            create: true,
            delete: true,
            update: true,
          },
        },
        shopifyDiscountRedeemCode: {
          read: {
            filter:
              "accessControl/filters/shopify/shopifyDiscountRedeemCode.gelly",
          },
          actions: {
            create: true,
            delete: true,
            update: true,
          },
        },
        shopifyDuty: {
          read: {
            filter: "accessControl/filters/shopify/shopifyDuty.gelly",
          },
          actions: {
            create: true,
            delete: true,
            update: true,
          },
        },
        shopifyFulfillment: {
          read: {
            filter:
              "accessControl/filters/shopify/shopifyFulfillment.gelly",
          },
          actions: {
            create: true,
            delete: true,
            update: true,
          },
        },
        shopifyFulfillmentEvent: {
          read: {
            filter:
              "accessControl/filters/shopify/shopifyFulfillmentEvent.gelly",
          },
          actions: {
            create: true,
            delete: true,
            update: true,
          },
        },
        shopifyFulfillmentLineItem: {
          read: {
            filter:
              "accessControl/filters/shopify/shopifyFulfillmentLineItem.gelly",
          },
          actions: {
            create: true,
            delete: true,
            update: true,
          },
        },
        shopifyGdprRequest: {
          read: {
            filter:
              "accessControl/filters/shopify/shopifyGdprRequest.gelly",
          },
          actions: {
            create: true,
            update: true,
          },
        },
        shopifyOrder: {
          read: {
            filter:
              "accessControl/filters/shopify/shopifyOrder.gelly",
          },
          actions: {
            delete: true,
            update: true,
          },
        },
        shopifyOrderAdjustment: {
          read: {
            filter:
              "accessControl/filters/shopify/shopifyOrderAdjustment.gelly",
          },
          actions: {
            create: true,
            delete: true,
            update: true,
          },
        },
        shopifyOrderLineItem: {
          read: {
            filter:
              "accessControl/filters/shopify/shopifyOrderLineItem.gelly",
          },
          actions: {
            create: true,
            delete: true,
            update: true,
          },
        },
        shopifyOrderRisk: {
          read: {
            filter:
              "accessControl/filters/shopify/shopifyOrderRisk.gelly",
          },
          actions: {
            create: true,
            delete: true,
            update: true,
          },
        },
        shopifyOrderTransaction: {
          read: {
            filter:
              "accessControl/filters/shopify/shopifyOrderTransaction.gelly",
          },
          actions: {
            create: true,
            delete: true,
            update: true,
          },
        },
        shopifyPriceRule: {
          read: {
            filter:
              "accessControl/filters/shopify/shopifyPriceRule.gelly",
          },
        },
        shopifyProduct: {
          read: {
            filter:
              "accessControl/filters/shopify/shopifyProduct.gelly",
          },
        },
        shopifyProductVariant: {
          read: {
            filter:
              "accessControl/filters/shopify/shopifyProductVariant.gelly",
          },
        },
        shopifyRefund: {
          read: {
            filter:
              "accessControl/filters/shopify/shopifyRefund.gelly",
          },
          actions: {
            create: true,
            delete: true,
            update: true,
          },
        },
        shopifyRefundDuty: {
          read: {
            filter:
              "accessControl/filters/shopify/shopifyRefundDuty.gelly",
          },
          actions: {
            create: true,
            delete: true,
            update: true,
          },
        },
        shopifyRefundLineItem: {
          read: {
            filter:
              "accessControl/filters/shopify/shopifyRefundLineItem.gelly",
          },
          actions: {
            create: true,
            delete: true,
            update: true,
          },
        },
        shopifyShippingAddress: {
          read: {
            filter:
              "accessControl/filters/shopify/shopifyShippingAddress.gelly",
          },
          actions: {
            create: true,
            delete: true,
            update: true,
          },
        },
        shopifyShippingLine: {
          read: {
            filter:
              "accessControl/filters/shopify/shopifyShippingLine.gelly",
          },
          actions: {
            create: true,
            delete: true,
            update: true,
          },
        },
        shopifyShop: {
          read: {
            filter: "accessControl/filters/shopify/shopifyShop.gelly",
          },
          actions: {
            install: true,
            reinstall: true,
            setDoubleDiscountMetafield: true,
            uninstall: true,
            update: true,
          },
        },
        shopifySync: {
          read: {
            filter: "accessControl/filters/shopify/shopifySync.gelly",
          },
          actions: {
            abort: true,
            complete: true,
            error: true,
            run: true,
          },
        },
        shopifyTenderTransaction: {
          read: {
            filter:
              "accessControl/filters/shopify/shopifyTenderTransaction.gelly",
          },
          actions: {
            create: true,
            delete: true,
            update: true,
          },
        },
      },
      actions: {
        manualActivateCartTransform: true,
        saveMupSettings: true,
        scheduledShopifySync: true,
      },
    },
    "shopify-storefront-customers": {
      storageKey: "Role-Shopify-Customer",
      models: {
        shopifyCheckout: {
          read: {
            filter:
              "accessControl/filters/shopify/storefront-customers/shopifyCheckout.gelly",
          },
        },
        shopifyCompanyContact: {
          read: {
            filter:
              "accessControl/filters/shopify/storefront-customers/shopifyCompanyContact.gelly",
          },
        },
        shopifyCustomer: {
          read: {
            filter:
              "accessControl/filters/shopify/storefront-customers/shopifyCustomer.gelly",
          },
        },
        shopifyCustomerAddress: {
          read: {
            filter:
              "accessControl/filters/shopify/storefront-customers/shopifyCustomerAddress.gelly",
          },
        },
        shopifyGiftCard: {
          read: {
            filter:
              "accessControl/filters/shopify/storefront-customers/shopifyGiftCard.gelly",
          },
        },
        shopifyOrder: {
          read: {
            filter:
              "accessControl/filters/shopify/storefront-customers/shopifyOrder.gelly",
          },
        },
      },
    },
    unauthenticated: {
      storageKey: "unauthenticated",
      models: {
        shopifyCart: {
          actions: {
            read: true,
          },
        },
      },
    },
  },
};
