import storeCredits from '../lib/storeCredit.json';
import giftCardCodes from '../lib/giftCardCodes.json'

/** @type { ActionRun } */
export const run = async ({ params, logger, api, connections }) => {
    const convertDateFormat = (dateStr: string): string => {
        const [day, month, year] = dateStr.split('/');
        return [year, month, day].join('-');
    };

    const shopify = await connections.shopify.forShopDomain("b32dd2-83.myshopify.com");
     // Take only first 10 items
    const testBatch = giftCardCodes.slice(10);
    // Process each store credit item
    for (const giftCardCode of giftCardCodes) {
        // Skip non-UK/Int stores
        // if (storeCreditItem.for_website !== "BrewDog UK / Int") {
        //     logger.info({ storeCreditItem }, "Skipping non-UK/Int store credit");
        //     continue;
        // }

        // const query = `query MyQuery {
        //     customerSegmentMembers(
        //         query: "metafields.custom.magento_id = '${storeCreditItem.customer_id}' "
        //         first: 10
        //     ) {
        //         edges {
        //             node {
        //                 id
        //                 lastName
        //                 firstName
        //                 note
        //                 defaultEmailAddress {
        //                     emailAddress
        //                 }
        //             }
        //         }
        //         totalCount
        //     }
        // }`;

        try {
            // const data = await shopify.graphql(query);
            // logger.info({ data }, "Customer lookup data");

            // // Skip if no customer found
            // if (!data.customerSegmentMembers.edges.length) {
            //     logger.warn({ customer_id: storeCreditItem.customer_id }, "No customer found");
            //     continue;
            // }

            // const customerId = data.customerSegmentMembers.edges[0].node.id.replace("gid://shopify/CustomerSegmentMember/", "");

            const mutation = `mutation GiftCardMutation {
                giftCardCreate(input: {
                    code: "${giftCardCode.code}"
                    initialValue: "${giftCardCode.remainingBalance}",
                    expiresOn: "${convertDateFormat(giftCardCode.expiryDate)}",
                    note: "Gift Card Import"
                }) {
                    giftCard {
                        id
                        initialValue {
                            amount
                        }
                        customer {
                            id
                        }
                        recipientAttributes {
                            recipient {
                                id
                            }
                            message
                            preferredName
                            sendNotificationAt
                        }
                    }
                    userErrors {
                        message
                        field
                        code
                    }
                }
            }`;

            const giftCardData = await shopify.graphql(mutation);
            logger.info({ giftCardData }, "Gift Card Created");

        } catch (error) {
            logger.error({ error, giftCardCode }, "Error processing gift card code");
            continue;
        }
    }

    logger.info("Completed processing all gift cards");
};