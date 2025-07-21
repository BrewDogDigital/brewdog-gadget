import React, { useEffect } from 'react';
import {
  reactExtension,
  Text,
  BlockLayout,
  View,
  useAttributeValues,
  useSettings,
  useApplyMetafieldsChange,
} from '@shopify/ui-extensions-react/checkout';

export default reactExtension(
  'purchase.checkout.block.render',
  () => <CheckoutNote />,
);

function CheckoutNote() {
  const [message] = useAttributeValues(['message']);
  const settings = useSettings();
  const applyMetafieldsChange = useApplyMetafieldsChange();

  // Get settings with fallback values
  const noteTitle = settings?.note_title || 'Gift Message';

  // Set metafield when message exists
  useEffect(() => {
    if (message) {
      applyMetafieldsChange({
        type: 'updateMetafield',
        namespace: 'move_fresh',
        key: 'gift_message',
        valueType: 'string',
        value: message,
      });
    }
  }, [message, applyMetafieldsChange]);

  // Only render if message exists
  if (!message) {
    return null;
  }

  return (
    <BlockLayout spacing="tight">
      <View
        border="base"
        cornerRadius="base"
        padding="base"
        background="subdued"
      >
        <BlockLayout spacing="tight">
          {/* Title aligned to the left */}
          <View>
            <Text emphasis="bold" size="medium">
              {noteTitle}
            </Text>
          </View>
          
          {/* Message content */}
          <Text size="base" appearance="subdued">
            {message}
          </Text>
        </BlockLayout>
      </View>
    </BlockLayout>
  );
} 