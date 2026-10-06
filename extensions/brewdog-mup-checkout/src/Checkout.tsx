import '@shopify/ui-extensions/preact';
import {render} from 'preact';
import {useState} from 'preact/hooks';
import {useAttributeValues} from '@shopify/ui-extensions/checkout/preact';

export default function extension() {
  render(<MupCheckoutGuidance />, document.body);
}

/**
 * Check if a postcode is Scottish
 */
function isScottishPostcode(postcode: string | null | undefined): boolean {
  if (!postcode) return false;
  
  const normalized = postcode.trim().toUpperCase().replace(/\s+/g, '');
  
  // TD15 is Berwick upon Tweed (England), not Scotland
  if (normalized.startsWith('TD15')) {
    return false;
  }
  
  // Scottish postcode prefixes (excluding G to handle Glasgow vs Guildford separately)
  const scottishPrefixes = [
    'AB', 'DD', 'DG', 'EH', 'FK',
    'HS', 'IV', 'KA', 'KW', 'KY', 'ML', 
    'PA', 'PH', 'TD', 'ZE'
  ];
  
  // Check standard prefixes
  if (scottishPrefixes.some(prefix => normalized.startsWith(prefix))) {
    return true;
  }
  
  // Special handling for Glasgow (G1-G9) - exclude Guildford (GU), Gloucester (GL), and Guernsey (GY)
  // Glasgow postcodes: G followed by a digit (G1, G2, G3, etc.)
  // Guildford postcodes: GU (England)
  // Gloucester postcodes: GL (England)
  // Guernsey postcodes: GY (Channel Islands)
  if (normalized.startsWith('G') && !normalized.startsWith('GU') && !normalized.startsWith('GL') && !normalized.startsWith('GY')) {
    // Check if second character is a digit (G1-G9 are Glasgow)
    const secondChar = normalized.charAt(1);
    if (secondChar && /[0-9]/.test(secondChar)) {
      return true;
    }
  }
  
  return false;
}

function MupCheckoutGuidance() {
  const cartLines = shopify.lines.value;
  const [ukRegion, mupOverride] = useAttributeValues(['uk_region', 'mup_override']);
  const discountCodes = shopify.discountCodes.value;
  const [isRemovingDiscount, setIsRemovingDiscount] = useState(false);
  const translate = (key: string) => String(shopify.i18n.translate(key));

  // Get addresses
  const billingAddress = shopify.billingAddress?.value;
  const shippingAddress = shopify.shippingAddress?.value;
  
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
      <s-banner tone="info">
        <s-stack gap="base">
          <s-heading>Scottish Address Detected</s-heading>
          
          <s-text>
            {isBillingScottish && `Your billing address (${billingPostcode}) is in Scotland. `}
            {isShippingScottish && `Your delivery address (${shippingPostcode}) is in Scotland. `}
            Minimum Unit Pricing (MUP) must be applied for Scottish addresses.
          </s-text>

          <s-divider />

          <s-stack gap="small-200">
            <s-text type="strong">Action Required:</s-text>
            <s-unordered-list>
              <s-list-item>Return to your cart</s-list-item>
              <s-list-item>Select "Scotland" as your region</s-list-item>
              <s-list-item>Return to checkout to complete your order</s-list-item>
            </s-unordered-list>
          </s-stack>
          
          <s-text type="small" color="subdued">
            If you complete this order without selecting Scotland as your region, it will be held for manual review before fulfillment.
          </s-text>
        </s-stack>
      </s-banner>
    );
  }
  
  // Debug: Always log what we're seeing
  console.log('🔍 MUP Checkout Extension - Debug:', {
    ukRegion,
    mupOverride,
    hasScottishAddressMismatch,
    cartLinesCount: cartLines.length,
    billingPostcode,
    shippingPostcode,
    isBillingScottish,
    isShippingScottish
  });
  
  // Only show MUP info for Scotland customers
  if (ukRegion !== 'scotland') {
    console.log('❌ Not showing MUP UI - customer not in Scotland, ukRegion:', ukRegion);
    return null;
  }

  console.log('✅ Customer is in Scotland - checking if MUP enforcement is active');

  // Find all MUP levy lines
  const levyLines = cartLines.filter(line => {
    const mupAttr = line.attributes.find((attr: any) => attr.key === 'mup');
    return mupAttr?.value === 'true';
  });

  // Check if there are alcoholic products (products with units_per_item metafield or MUP attributes)
  // but no levy lines - this indicates enforcement is disabled
  const hasAlcoholicProducts = cartLines.some(line => {
    const mupAttr = line.attributes.find((attr: any) => attr.key === 'mup');
    if (mupAttr?.value === 'true') return false; // Skip levy lines
    
    // Check for MUP attributes that indicate alcoholic products
    return line.attributes.some((attr: any) => 
      attr.key === 'mup_total_units' || 
      attr.key === 'original_price' ||
      attr.key === 'mup_levy_per_item'
    );
  });

  // Check if customer has applied a discount code
  const hasDiscountApplied = discountCodes.length > 0;
  
  console.log('✅ Customer is in Scotland - showing MUP UI');

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
  
  // Check if there are any product lines (not levy lines)
  const hasProductLines = cartLines.some(line => {
    const mupAttr = line.attributes.find((attr: any) => attr.key === 'mup');
    return mupAttr?.value !== 'true'; // Not a levy line
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
        await shopify.applyDiscountCodeChange({
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
    <s-stack gap="base">
      {/* MUP Notice Banner */}


      {/* Repair UI - Show when discount is applied in Scotland AND we detect alcoholic products (but NOT if override is active) */}
      {/* The validation function will actually block checkout if there's a MUP violation */}
      {hasDiscountApplied && !hasOverride && (hasAlcoholicProducts || hasProductLines) && (
        <s-banner tone="info">
          <s-stack gap="base">
            <s-heading>Possible MUP Violation</s-heading>
            
            <s-text>
              If your item has an mup levy applied, then your discount reduces the price below the legal minimum unit price for Scotland. Please remove your discount code to proceed with checkout.
            </s-text>

            <s-text>If your item does not have an mup levy applied, then your discount code is valid and you may proceed with checkout.</s-text>

            <s-divider />

            <s-stack gap="small-200">
              <s-text type="strong">How to complete your purchase if you have an mup levy applied:</s-text>
              <s-unordered-list>
                <s-list-item>Remove your discount code</s-list-item>
              </s-unordered-list>
            </s-stack>

            <s-divider />

            <s-stack gap="small-200">
              <s-text type="strong">Quick Fix:</s-text>
              <s-button
                variant="secondary"
                loading={isRemovingDiscount}
                onClick={handleRemoveDiscounts}
                tone="critical"
              >
                {isRemovingDiscount ? 'Removing...' : 'Remove Discount Code'}
              </s-button>
              <s-text type="small" color="subdued">
                This will remove your discount code and allow checkout to proceed.
              </s-text>
            </s-stack>
          </s-stack>
        </s-banner>
      )}
      
      {/* Show override success message */}
      {hasDiscountApplied && hasOverride && (
        <s-banner tone="success">
          <s-stack gap="small-200">
            <s-text type="strong">✓ Override Code Detected</s-text>
            <s-text type="small">
              MUP enforcement has been bypassed for this order. You may proceed to checkout.
            </s-text>
          </s-stack>
        </s-banner>
      )}

      <s-banner tone="info">
        <s-stack gap="small-200">
          <s-text type="strong">
            {translate('scotland_notice')}
          </s-text>
          <s-text type="small">
            Alcohol must remain above £0.65/unit in Scotland.
          </s-text>
          <s-text type="small">
            <s-text type="strong">Note:</s-text> Invalid discounts will be removed at checkout.
          </s-text>
        </s-stack>
      </s-banner>

      {/* Levy Summary - only show if there are levies */}
      {hasLevies && totalLevy > 0 && (
        <s-box border="base" padding="base" borderRadius="base">
          <s-stack gap="small-200">
          <s-heading>{translate('levy_summary')}</s-heading>
          <s-divider />
          <s-stack gap="small-200">
            {levyLines.map((line, index) => {
              const levyPerItem = parseFloat(
                line.attributes.find((attr: any) => attr.key === 'mup_levy_per_item')?.value || '0'
              );
              const lineTotal = levyPerItem * line.quantity;
              
              return (
                <s-stack key={line.id || index} gap="small-200">
                  <s-text type="small">
                    {line.quantity} × MUP Levy @ £{levyPerItem.toFixed(2)} each
                  </s-text>
                  <s-text type="strong">
                    £{lineTotal.toFixed(2)}
                  </s-text>
                </s-stack>
              );
            })}
            <s-divider />
            <s-stack gap="small-200">
              <s-text type="strong">{translate('total_levy')}</s-text>
              <s-text type="strong">
                £{totalLevy.toFixed(2)}
              </s-text>
            </s-stack>
          </s-stack>
          </s-stack>
        </s-box>
      )}

    </s-stack>
  );
}
