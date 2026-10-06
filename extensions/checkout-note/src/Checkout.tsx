import '@shopify/ui-extensions/preact';
import {render} from 'preact';
import {useEffect} from 'preact/hooks';
import {useAttributeValues} from '@shopify/ui-extensions/checkout/preact';

export default function extension() {
  render(<CheckoutNote />, document.body);
}

function CheckoutNote() {
  const [message] = useAttributeValues(['message']);

  // Get settings with fallback values
  const noteTitle =
    (shopify.settings.value.note_title as string | undefined) || 'Gift Message';

  // Set metafield when message exists
  useEffect(() => {
    if (!message || !shopify.instructions.value.metafields.canSetCartMetafields) {
      return;
    }

    void shopify
      .applyMetafieldChange({
        type: 'updateCartMetafield',
        metafield: {
          namespace: 'move_fresh',
          key: 'gift_message',
          type: 'single_line_text_field',
          value: message,
        },
      })
      .then((result) => {
        if (result.type === 'error') {
          console.error('[Checkout Note] Failed to save gift message:', result.message);
        }
      });
  }, [message]);

  // Only render if message exists
  if (!message) {
    return null;
  }

  return (
    <s-box border="base" borderRadius="base" padding="base">
      <s-stack gap="small-200">
        <s-heading>{noteTitle}</s-heading>
        <s-text>{message}</s-text>
      </s-stack>
    </s-box>
  );
}