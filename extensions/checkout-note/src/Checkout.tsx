import React from 'react';
import {
  reactExtension,
  Text,
  BlockLayout,
  View,
  useNote,
  useSettings,
  Icon,
} from '@shopify/ui-extensions-react/checkout';

export default reactExtension(
  'purchase.checkout.block.render',
  () => <CheckoutNote />,
);

function CheckoutNote() {
  const note = useNote();
  const settings = useSettings();

  // Get settings with fallback values
  const noteTitle = settings?.note_title || 'Gift Message';

  // Only render if note exists
  if (!note) {
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
          
          {/* Note content */}
          <Text size="base" appearance="subdued">
            {note}
          </Text>
        </BlockLayout>
      </View>
    </BlockLayout>
  );
} 