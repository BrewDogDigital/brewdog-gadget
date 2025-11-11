import { useState } from 'react';
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
  useBillingAddress,
  useShippingAddress,
} from '@shopify/ui-extensions-react/checkout';

export default reactExtension(
  'purchase.checkout.block.render',
  () => <MupCheckoutGuidance />,
);

/**
 * Check if a postcode is Scottish
 */
function isScottishPostcode(postcode: string | null | undefined): boolean {
  if (!postcode) return false;
  
  const normalized = postcode.trim().toUpperCase().replace(/\s+/g, '');
  
  const scottishPrefixes = [
    'AB', 'DD', 'DG', 'EH', 'FK', 'G', 
    'HS', 'IV', 'KA', 'KW', 'KY', 'ML', 
    'PA', 'PH', 'TD', 'ZE'
  ];
  
  return scottishPrefixes.some(prefix => normalized.startsWith(prefix));
}

function MupCheckoutGuidance() {
  const translate = useTranslate();
  const cartLines = useCartLines();
  const [ukRegion, mupOverride] = useAttributeValues(['uk_region', 'mup_override']);
  const discountCodes = useDiscountCodes();
  const applyDiscountCodeChange = useApplyDiscountCodeChange();
  const [isRemovingDiscount, setIsRemovingDiscount] = useState(false);

  // Get addresses
  const billingAddress = useBillingAddress();
  const shippingAddress = useShippingAddress();
  
  // Check if MUP override is active
  const hasOverride = mupOverride === 'true';
  console.log('MUP Override active:', hasOverride);



  // Check for Scottish billing address mismatch
  const billingPostcode = billingAddress?.zip;
  const shippingPostcode = shippingAddress?.zip;
  const isBillingScottish = isScottishPostcode(billingPostcode);
  const isShippingScottish = isScottishPostcode(shippingPostcode);
  
  console.log('Address check:', { 
    ukRegion, 
    billingPostcode, 
    shippingPostcode,
    isBillingScottish,
    isShippingScottish
  });
  
  // Show warning if Scottish address detected but region not set to Scotland
  const hasScottishAddressMismatch = (isBillingScottish || isShippingScottish) && ukRegion !== 'scotland';
  
  // If customer has Scottish address but hasn't selected Scotland, show critical warning
  if (hasScottishAddressMismatch) {
    return (
      <Banner status="critical">
        <BlockStack spacing="base">
          <Heading level={2}>⚠️ Scottish Address Detected</Heading>
          
          <Text>
            {isBillingScottish && `Your billing address (${billingPostcode}) is in Scotland. `}
            {isShippingScottish && `Your delivery address (${shippingPostcode}) is in Scotland. `}
            Minimum Unit Pricing (MUP) must be applied for Scottish addresses.
          </Text>

          <Divider />

          <BlockStack spacing="tight">
            <Text emphasis="bold">Action Required:</Text>
            <List>
              <ListItem>Return to your cart</ListItem>
              <ListItem>Select "Scotland" as your region</ListItem>
              <ListItem>Return to checkout to complete your order</ListItem>
            </List>
          </BlockStack>
          
          <Text size="small" appearance="subdued">
            If you complete this order without selecting Scotland as your region, it will be held for manual review before fulfillment.
          </Text>
        </BlockStack>
      </Banner>
    );
  }
  
  // Only show MUP info for Scotland customers
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
  
  // Check if there are any product lines (not levy lines)
  const hasProductLines = cartLines.some(line => {
    const mupAttr = line.attributes.find((attr: any) => attr.key === 'mup');
    return mupAttr?.value !== 'true'; // Not a levy line
  });
  
  // Check if there are any lines with MUP-related attributes (alcoholic products)
  // OR if there are levy lines (definitely has alcoholic products)
  const hasAlcoholicProducts = levyLines.length > 0 || cartLines.some(line => {
    const mupAttr = line.attributes.find((attr: any) => attr.key === 'mup');
    if (mupAttr?.value === 'true') return false; // Skip levy lines
    
    // Check for MUP attributes that indicate alcoholic products
    return line.attributes.some((attr: any) => 
      attr.key === 'mup_total_units' || 
      attr.key === 'original_price' ||
      attr.key === 'mup_levy_per_item'
    );
  });
  
  console.log('MUP Checkout Block State:', {
    cartLinesCount: cartLines.length,
    levyLinesCount: levyLines.length,
    hasProductLines,
    hasAlcoholicProducts,
    hasDiscountApplied,
    hasOverride,
    ukRegion,
    cartLines: cartLines.map(line => ({
      id: line.id,
      attributes: line.attributes
    }))
  });

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


      {/* Repair UI - Show when discount is applied in Scotland AND we detect alcoholic products (but NOT if override is active) */}
      {/* The validation function will actually block checkout if there's a MUP violation */}
      {hasDiscountApplied && !hasOverride && (hasAlcoholicProducts || hasProductLines) && (
        <Banner status="critical">
          <BlockStack spacing="base">
            <Heading level={3}>Possible MUP Violation</Heading>
            
            <Text>
              If your item has an mup levy applied, then your discount reduces the price below the legal minimum unit price for Scotland. Please remove your discount code to proceed with checkout.
            </Text>

            <Text>If your item does not have an mup levy applied, then your discount code is valid and you may proceed with checkout.</Text>

            <Divider />

            <BlockStack spacing="tight">
              <Text emphasis="bold">How to complete your purchase if you have an mup levy applied:</Text>
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
      
      {/* Show override success message */}
      {hasDiscountApplied && hasOverride && (
        <Banner status="success">
          <BlockStack spacing="tight">
            <Text emphasis="bold">✓ Override Code Detected</Text>
            <Text size="small">
              MUP enforcement has been bypassed for this order. You may proceed to checkout.
            </Text>
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
