import {
  reactExtension,
  Banner,
  BlockStack,
  Checkbox,
  Text,
  useApi,
  useApplyAttributeChange,
  useInstructions,
  useTranslate,
  Link,
  useEmail,
  useCustomer,
  useAttributes,
  useShippingAddress,
  useShop,
  useSettings,
} from "@shopify/ui-extensions-react/checkout";
import { useState } from "react";

// 1. Choose an extension target
export default reactExtension("purchase.checkout.actions.render-before", () => (
  <Extension />
));

function Extension() {
  const translate = useTranslate();
  const instructions = useInstructions();
  const shippingAddress = useShippingAddress();
  const email = useEmail();
  const shop = useShop();
  const { subscribedToMarketing, privacyPolicyURL, privacyPolicyText, consentToMarketing, consentToMarketing2 } = useSettings();
  const [hasSubscribed, setHasSubscribed] = useState(false);

  // Check if the store is "fr.brewdog.com"
  const isFrenchStore = shop.storefrontUrl.includes("fr.brewdog.com");

  // If the store is FR, do not show the checkbox
  if (isFrenchStore) {
    return null;
  }

  // If attributes cannot be updated, show a warning
  if (!instructions.attributes.canUpdateAttributes) {
    return (
      <Banner title="uwp-bloomreach-consent" status="warning">
        {translate("attributeChangesAreNotSupported")}
      </Banner>
    );
  }

  // 3. Render the UI only if not an FR store
  return (
    <BlockStack border={"dotted"} padding={"tight"}>
      {hasSubscribed ? (
        <Text>{subscribedToMarketing}</Text>
      ) : (
        <Checkbox onChange={onCheckboxChange} disabled={email === undefined || shippingAddress.firstName === undefined}>
          {consentToMarketing}
        </Checkbox>
      )}
      <Text>
        {consentToMarketing2} <Link to={privacyPolicyURL as string}>{privacyPolicyText}</Link>.
      </Text>
    </BlockStack>
  );

  async function onCheckboxChange(isChecked) {
    if (isFrenchStore) {
      console.log("FR store detected, not sending event.");
      return;
    }

    console.log("email from check function", email);
    console.log("isChecked", isChecked);
    console.log("shippingAddress First Name", shippingAddress.firstName);

    if (isChecked && email && shippingAddress.firstName) {
      console.log("Calling BR API");

      try {
        const response = await fetch("https://brewdog.gadget.app/sign-up", {
          method: "POST",
          body: JSON.stringify({
            "params": {
              "email": email,
              "name": shippingAddress.firstName,
              "url": shop.storefrontUrl + "/checkout"
            }
          })
        });

        console.log("Tracking response:", response);

        setHasSubscribed(true);

      } catch (error) {
        console.error("Error tracking consent:", error);
      }
    }
  }
}
