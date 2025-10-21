import React, { useState } from 'react';
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
  Button,
  useCartLines,
  useAttributeValues,
  useTranslate,
  useDiscountCodes,
  useApplyDiscountCodeChange,
} from '@shopify/ui-extensions-react/checkout';

export default reactExtension(
  'purchase.checkout.block.render',
  () => <MupCheckoutGuidance />,
);

function MupCheckoutGuidance() {
  const translate = useTranslate();
  const cartLines = useCartLines();
  const [ukRegion] = useAttributeValues(['uk_region']);
  const discountCodes = useDiscountCodes();
  const applyDiscountCodeChange = useApplyDiscountCodeChange();
  const [isRemovingDiscount, setIsRemovingDiscount] = useState(false);



  // Only show for Scotland customers
  if (ukRegion !== 'scotland') {
    console.log('❌ Not showing MUP UI - customer not in Scotland, ukRegion:', ukRegion);
    return null;
  }

  console.log('✅ Customer is in Scotland - showing MUP UI');

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

  // Check if customer has applied a discount code using the proper API
  const hasDiscountApplied = discountCodes.length > 0;

  // Function to remove all discount codes
  const handleRemoveDiscounts = async () => {
    setIsRemovingDiscount(true);
    try {
      // Remove each discount code
      for (const discountCode of discountCodes) {
        await applyDiscountCodeChange({
          type: 'removeDiscountCode',
          code: discountCode.code,
        });
      }
    } catch (error) {
      console.error('Failed to remove discount codes:', error);
    } finally {
      setIsRemovingDiscount(false);
    }
  };

  return (
    <BlockStack spacing="base">
      {/* MUP Notice Banner */}


      {/* Repair UI - Show when discount is applied in Scotland */}
      {hasDiscountApplied && (
        <Banner status="critical">
          <BlockStack spacing="base">
            <Heading level={3}>Checkout Blocked - MUP Violation</Heading>
            
            <Text>
              Your discount reduces the price below the legal minimum unit price for Scotland.
            </Text>

            <Divider />

            <BlockStack spacing="tight">
              <Text emphasis="bold">How to complete your purchase:</Text>
              <List>
                <ListItem>Remove your discount code</ListItem>
              </List>
            </BlockStack>

            <Divider />

            <BlockStack spacing="tight">
              <Text emphasis="bold">Quick Fix:</Text>
              <Button
                kind="secondary"
                loading={isRemovingDiscount}
                onPress={handleRemoveDiscounts}
                background="critical"
              >
                {isRemovingDiscount ? 'Removing...' : 'Remove Discount Code'}
              </Button>
              <Text size="small" appearance="subdued">
                This will remove your discount code and allow checkout to proceed.
              </Text>
            </BlockStack>
          </BlockStack>
        </Banner>
      )}

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

      {/* Info about validation - always show for Scotland customers */}
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
