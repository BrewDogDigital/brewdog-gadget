import '@shopify/ui-extensions/preact';
import {render} from 'preact';
import {useState} from 'preact/hooks';

// 1. Choose an extension target
export default function extension() {
  render(<Extension />, document.body);
}

function Extension() {
  const instructions = shopify.instructions.value;
  const shippingAddress = shopify.shippingAddress?.value;
  const email = shopify.buyerIdentity?.email.value;
  const shop = shopify.shop;
  const {
    subscribedToMarketing,
    privacyPolicyURL,
    privacyPolicyText,
    consentToMarketing,
    consentToMarketing2,
  } = shopify.settings.value;
  const [hasSubscribed, setHasSubscribed] = useState(false);

  // Check if the store is "fr.brewdog.com"
  const isFrenchStore = shop.storefrontUrl?.includes('fr.brewdog.com') ?? false;

  // If the store is FR, do not show the checkbox
  if (isFrenchStore) {
    return null;
  }

  // If attributes cannot be updated, show a warning
  if (!instructions.attributes.canUpdateAttributes) {
    return (
      <s-banner heading="uwp-bloomreach-consent" tone="warning">
        {shopify.i18n.translate('attributeChangesAreNotSupported')}
      </s-banner>
    );
  }

  // 3. Render the UI only if not an FR store
  return (
    <s-box border="base" padding="base">
      <s-stack gap="small-200">
      {hasSubscribed ? (
        <s-text>{String(subscribedToMarketing ?? '')}</s-text>
      ) : (
        <s-checkbox
          onChange={onCheckboxChange}
          disabled={email === undefined || shippingAddress?.firstName === undefined}
          label={String(consentToMarketing ?? '')}
        />
      )}
      <s-text>
        {String(consentToMarketing2 ?? '')}{' '}
        <s-link href={String(privacyPolicyURL ?? '')}>
          {String(privacyPolicyText ?? '')}
        </s-link>
        .
      </s-text>
      </s-stack>
    </s-box>
  );

  async function onCheckboxChange(event: Event) {
    const isChecked = (event.target as HTMLInputElement).checked;

    if (isFrenchStore) {
      console.log('FR store detected, not sending event.');
      return;
    }

    console.log('email from check function', email);
    console.log('isChecked', isChecked);
    console.log('shippingAddress First Name', shippingAddress?.firstName);

    if (isChecked && email && shippingAddress?.firstName) {
      console.log('Calling BR API');

      try {
        const response = await fetch('https://brewdog.gadget.app/sign-up', {
          method: "POST",
          body: JSON.stringify({
            "params": {
              "email": email,
              "name": shippingAddress.firstName,
              "url": `${shop.storefrontUrl ?? ''}/checkout`,
            }
          }),
        });

        console.log('Tracking response:', response);

        setHasSubscribed(true);

      } catch (error) {
        console.error('Error tracking consent:', error);
      }
    }
  }
}
