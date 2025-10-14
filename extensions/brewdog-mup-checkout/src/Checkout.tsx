import React from 'react';
import {
  reactExtension,
  Banner,
  BlockStack,
  Text,
  Heading,
  Divider,
  List,
  ListItem,
  Link,
  useCartLines,
  useAttributeValues,
  useTranslate,
} from '@shopify/ui-extensions-react/checkout';

export default reactExtension(
  'purchase.checkout.block.render',
  () => <MupCheckoutGuidance />,
);

function MupCheckoutGuidance() {
  const translate = useTranslate();
  const cartLines = useCartLines();
  const [ukRegion] = useAttributeValues(['uk_region']);

  // Only show for Scotland customers
  if (ukRegion !== 'scotland') {
    return null;
  }

  // Find all MUP levy lines
  const levyLines = cartLines.filter(line => {
    const mupAttr = line.attributes.find((attr: any) => attr.key === 'mup');
    return mupAttr?.value === 'true';
  });

  // Calculate total levy amount
  const totalLevy = levyLines.reduce((sum, line) => {
    const levyAmount = parseFloat(
      line.attributes.find((attr: any) => attr.key === 'mup_levy_per_item')?.value || '0'
    );
    return sum + (levyAmount * line.quantity);
  }, 0);

  // Simple detection: if there are levy lines, show info
  // The validation function will block checkout if there's an actual violation
  const hasLevies = levyLines.length > 0;

  return (
    <BlockStack spacing="base">
      {/* MUP Notice Banner */}
      <Banner status="info">
        <BlockStack spacing="tight">
          <Text emphasis="bold">
            {translate('scotland_notice')}
          </Text>
          <Text size="small">
            Minimum Unit Pricing (MUP) ensures alcohol is not sold below £0.65 per unit in Scotland.
          </Text>
        </BlockStack>
      </Banner>

      {/* Levy Summary - only show if there are levies */}
      {hasLevies && totalLevy > 0 && (
        <BlockStack spacing="tight" border="base" padding="base" cornerRadius="base">
          <Heading level={3}>{translate('levy_summary')}</Heading>
          <Divider />
          <BlockStack spacing="tight">
            {levyLines.map((line, index) => {
              const levyPerItem = parseFloat(
                line.attributes.find((attr: any) => attr.key === 'mup_levy_per_item')?.value || '0'
              );
              const lineTotal = levyPerItem * line.quantity;
              
              return (
                <BlockStack key={line.id || index} spacing="extraTight">
                  <Text size="small">
                    {line.quantity} × MUP Levy @ £{levyPerItem.toFixed(2)} each
                  </Text>
                  <Text size="small" emphasis="bold">
                    £{lineTotal.toFixed(2)}
                  </Text>
                </BlockStack>
              );
            })}
            <Divider />
            <BlockStack spacing="extraTight">
              <Text emphasis="bold">{translate('total_levy')}</Text>
              <Text size="large" emphasis="bold">
                £{totalLevy.toFixed(2)}
              </Text>
            </BlockStack>
          </BlockStack>
        </BlockStack>
      )}

      {/* Info about validation - validation function will actually block checkout */}
      <Banner status="info">
        <BlockStack spacing="tight">
          <Text size="small">
            <Text emphasis="bold">Note:</Text> Discount codes that reduce prices below the minimum unit price will be automatically blocked at checkout.
          </Text>
          <Link to="https://www.mygov.scot/minimum-unit-pricing-alcohol" external>
            {translate('learn_more')}
          </Link>
        </BlockStack>
      </Banner>
    </BlockStack>
  );
}
