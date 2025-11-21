// MUP Levy Handler
(function() {
  'use strict';

  let mupSettings = null;
  let storefrontApiUrl = null;



  // Initialize Storefront API URL
  function initStorefrontApi() {
    if (window.themeVars?.config?.storefrontAccessToken && window.themeVars?.config?.storefrontApiVersion) {
      // Get shop domain - handle both cases: just shop name or full domain
      let shopDomain = window.Shopify?.shop || window.location.hostname;
      
      // If shopDomain already contains .myshopify.com, use it as is
      // Otherwise, extract shop name and append .myshopify.com
      if (!shopDomain.includes('.myshopify.com')) {
        // Remove .myshopify.com if present, then add it back
        shopDomain = shopDomain.replace('.myshopify.com', '');
        shopDomain = `${shopDomain}.myshopify.com`;
      }
      
      storefrontApiUrl = `https://${shopDomain}/api/2025-10/graphql.json`;
      return true;
    }
    return false;
  }

  // Get MUP settings from Shopify shop metafields using Storefront API
  async function getMupSettings() {
    if (mupSettings) return mupSettings;

    if (!storefrontApiUrl || !window.themeVars?.config?.storefrontAccessToken) {
      console.error('[MUP Levy] Storefront API not configured');
      return null;
    }

    const query = `
      query getMupSettings {
        shop {
          mupLevyProduct: metafield(namespace: "custom", key: "mup_levy_product") {
            value
          }
          minimumUnitPrice: metafield(namespace: "custom", key: "minimum_unit_price") {
            value
          }
          enforcementEnabled: metafield(namespace: "custom", key: "mup_enforcement_enabled") {
            value
          }
        }
      }
    `;

    try {
      const response = await fetch(storefrontApiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Storefront-Access-Token': window.themeVars.config.storefrontAccessToken
        },
        body: JSON.stringify({ query })
      });

      const result = await response.json();
      if (result.errors) {
        console.error('[MUP Levy] GraphQL errors:', result.errors);
        return null;
      }

      const shop = result.data?.shop;
      if (!shop) {
        return null;
      }

      const levyVariantId = shop.mupLevyProduct?.value;
      if (!levyVariantId) {
        console.warn('[MUP Levy] MUP levy product not configured');
        return null;
      }

      // Extract variant ID number (not GID) for cart API
      const levyVariantIdNum = levyVariantId.includes('/') 
        ? levyVariantId.split('/').pop() 
        : levyVariantId;

      console.log('[MUP Levy] Raw levy variant ID from metafield:', levyVariantId);
      console.log('[MUP Levy] Extracted numeric levy variant ID:', levyVariantIdNum);

      mupSettings = {
        success: true,
        levyVariantId: levyVariantIdNum,
        minimumUnitPrice: parseFloat(shop.minimumUnitPrice?.value || '0.65'),
        enforcementEnabled: true
      };

      return mupSettings;
    } catch (error) {
      console.error('[MUP Levy] Failed to get MUP settings:', error);
      return null;
    }
  }

  // Get Gadget backend URL based on environment
  function getGadgetBackendUrl() {
    const domain = window.Shopify?.shop || window.location.hostname;
    
    // Check if we're on a dev Shopify store
    if (domain.includes('brewdog-dev') || domain.includes('--development') || domain.includes('localhost') || domain.includes('127.0.0.1')) {
      return 'https://brewdog--development.gadget.app';
    }
    
    // Default to production
    return 'https://brewdog.gadget.app';
  }

  // Query variant metafields using Gadget backend API (Admin API has full access)
  async function getVariantData(variantId) {
    // Convert variant ID to number if it's a string with GID format
    const variantIdNum = String(variantId).replace('gid://shopify/ProductVariant/', '');

    try {
      const backendUrl = getGadgetBackendUrl();
      const shopDomain = window.Shopify?.shop || window.location.hostname;
      const response = await fetch(`${backendUrl}/mup-variant-data?variantId=${variantIdNum}&shopDomain=${encodeURIComponent(shopDomain)}`);
      
      if (!response.ok) {
        console.error('[MUP Levy] Failed to fetch variant data:', response.status);
        return null;
      }

      const result = await response.json();
      if (!result.success || !result.variant) {
        console.error('[MUP Levy] Variant data not found:', result.error);
        return null;
      }

      // Transform backend response to expected format
      return {
        id: result.variant.id,
        price: {
          amount: String(result.variant.price),
          currencyCode: 'GBP'
        },
        metafield: result.variant.units ? {
          value: String(result.variant.units),
          type: 'number_decimal'
        } : null
      };
    } catch (error) {
      console.error('[MUP Levy] Failed to query variant:', error);
      return null;
    }
  }

  // Check if item needs MUP levy
  async function checkItemNeedsLevy(item) {
    // Skip if this is already a levy item
    if (item.properties && (item.properties.mup === 'true' || item.properties.mup === true)) {
      return false;
    }

    const settings = await getMupSettings();
    if (!settings || !settings.enforcementEnabled) {
      return false;
    }

    // Check if customer is in Scotland
    const cartData = await fetch('/cart.js').then(r => r.json());
    const ukRegion = cartData.attributes?.uk_region;
    if (ukRegion !== 'scotland') {
      return false;
    }

    // Get variant data
    const variantData = await getVariantData(item.variant_id);
    if (!variantData) {
      return false;
    }

    // Get units from variant metafield
    const unitsPerItem = parseFloat(variantData.metafield?.value || '0');
    if (unitsPerItem <= 0) {
      return false; // No alcohol units, no MUP needed
    }

    const pricePerItem = parseFloat(variantData.price?.amount || item.price || '0');
    const minimumUnitPrice = settings.minimumUnitPrice || 0.65;
    const mupFloorPerItem = unitsPerItem * minimumUnitPrice;

    return {
      needsLevy: pricePerItem < mupFloorPerItem,
      levyAmount: pricePerItem < mupFloorPerItem ? Math.ceil((mupFloorPerItem - pricePerItem) * 100) / 100 : 0,
      parentLineId: item.key || item.id,
      settings
    };
  }

  // Find levy line for a parent line
  function findLevyLine(cartItems, parentLineId) {
    return cartItems.find(item => 
      item.properties && 
      item.properties.parent_line_id === parentLineId &&
      (item.properties.mup === 'true' || item.properties.mup === true)
    );
  }

  // Verify levy variant exists and is available
  async function verifyLevyVariant(variantId) {
    try {
      const variantData = await getVariantData(variantId);
      if (!variantData) {
        console.error('[MUP Levy] Levy variant does not exist:', variantId);
        console.error('[MUP Levy] SOLUTION: The levy product must be:');
        console.error('[MUP Levy] 1. Published to the "Online Store" sales channel');
        console.error('[MUP Levy] 2. Active (not draft/archived)');
        console.error('[MUP Levy] 3. Set to "Continue selling when out of stock"');
        console.error('[MUP Levy] 4. Not restricted by metafields or other conditions');
        return false;
      }
      console.log('[MUP Levy] Levy variant verified:', variantData);
      return true;
    } catch (error) {
      console.error('[MUP Levy] Error verifying levy variant:', error);
      return false;
    }
  }

  // Add MUP levy to cart
  async function addMupLevy(parentLineId, levyAmount, quantity, settings, parentProductTitle = '') {
    if (!settings?.levyVariantId) {
      console.error('[MUP Levy] Levy variant ID not configured');
      return;
    }

    console.log('[MUP Levy] Attempting to add levy variant:', settings.levyVariantId);
    console.log('[MUP Levy] Levy amount:', levyAmount, 'Quantity:', quantity);
    console.log('[MUP Levy] Parent product title:', parentProductTitle);

    // Verify the levy variant exists before trying to add it
    const isValid = await verifyLevyVariant(settings.levyVariantId);
    if (!isValid) {
      console.error('[MUP Levy] Cannot add levy - variant does not exist or is not available');
      return;
    }

    try {
      const response = await fetch('/cart/add.js', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          items: [{
            id: parseInt(settings.levyVariantId),
            quantity: quantity,
            properties: {
              mup: 'true',
              parent_line_id: parentLineId,
              mup_levy_per_item: levyAmount.toString(),
              parent_product_title: parentProductTitle
            }
          }]
        })
      });

      const result = await response.json();
      console.log('[MUP Levy] Cart add response:', result);
      
      if (result.error || result.status) {
        console.error('[MUP Levy] Failed to add levy:', result.description || result.message || result);
        console.error('[MUP Levy] Please verify that:');
        console.error('[MUP Levy] 1. The levy variant ID is correct in MUP settings');
        console.error('[MUP Levy] 2. The levy product is published to the Online Store sales channel');
        console.error('[MUP Levy] 3. The levy variant is available for sale (not draft/archived)');
      } else {
        console.log('[MUP Levy] Levy added successfully');
        window.dispatchEvent(new CustomEvent('cart:updated'));
        // Don't dispatch cart:updated to avoid triggering the handler again
        // The cart UI will update on next page load or manual refresh
      }
    } catch (error) {
      console.error('[MUP Levy] Error adding levy:', error);
    }
  }

  // Remove MUP levy from cart
  async function removeMupLevy(levyItem) {
    try {
      const response = await fetch('/cart/change.js', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          id: levyItem.key,
          quantity: 0
        })
      });

      const result = await response.json();
      if (result.error || result.status) {
        console.error('[MUP Levy] Failed to remove levy:', result.description || result.message);
      } else {
        console.log('[MUP Levy] Levy removed successfully');
        // Don't dispatch cart:updated to avoid triggering the handler again
      }
    } catch (error) {
      console.error('[MUP Levy] Error removing levy:', error);
    }
  }

  // Track processing to prevent duplicate runs and debounce rapid changes
  let isProcessing = false;
  let debounceTimeout = null;
  let pendingCheck = false;

  // Disable/enable all ATC buttons
  function setAtcButtonsState(disabled) {
    const atcButtons = document.querySelectorAll('.product__atc-button, [data-atc-button], button[type="submit"][name="add"]');
    atcButtons.forEach(button => {
      if (disabled) {
        button.disabled = true;
        button.dataset.mupProcessing = 'true';
        // Store original text
        if (!button.dataset.originalText) {
          button.dataset.originalText = button.textContent;
        }
        button.textContent = 'Processing MUP...';
        button.style.opacity = '0.6';
        button.style.cursor = 'wait';
      } else {
        button.disabled = false;
        delete button.dataset.mupProcessing;
        // Restore original text
        if (button.dataset.originalText) {
          button.textContent = button.dataset.originalText;
          delete button.dataset.originalText;
        }
        button.style.opacity = '';
        button.style.cursor = '';
      }
    });
  }

  // Handle MUP levy check for cart items (debounced)
  async function handleMupLevyCheck(event) {
    // Mark that we have a pending check
    pendingCheck = true;
    
    // Clear any existing debounce timeout
    if (debounceTimeout) {
      clearTimeout(debounceTimeout);
    }

    // Don't disable buttons immediately - wait to check region first

    // Debounce: wait 500ms after the last cart change before processing
    debounceTimeout = setTimeout(async () => {
      await processMupLevyCheck(event);
    }, 500);
  }

  // Actual processing logic (called after debounce)
  async function processMupLevyCheck(event) {
    // Prevent duplicate processing
    if (isProcessing) {
      console.log('[MUP Levy] Already processing, will retry...');
      // Retry after current processing completes
      setTimeout(() => {
        if (pendingCheck) {
          handleMupLevyCheck(event);
        }
      }, 1000);
      return;
    }

    isProcessing = true;
    pendingCheck = false;
    
    console.log('[MUP Levy] Starting MUP levy check...');

    // Always fetch fresh cart data to avoid stale state
    const cartData = await fetch('/cart.js').then(r => r.json()).catch(err => {
      console.error('[MUP Levy] Failed to fetch cart:', err);
      return null;
    });
    
    if (!cartData || !cartData.items || cartData.items.length === 0) {
      console.log('[MUP Levy] Cart is empty or unavailable');
      isProcessing = false;
      setAtcButtonsState(false);
      return;
    }
    
    console.log('[MUP Levy] Processing cart with', cartData.items.length, 'items');

    // Check if customer is in Scotland
    const ukRegion = cartData.attributes?.uk_region;
    if (ukRegion !== 'scotland') {
      console.log('[MUP Levy] Customer not in Scotland, skipping MUP processing');
      // Remove any existing levy items if not in Scotland
      const levyItems = cartData.items.filter(item => 
        item.properties && (item.properties.mup === 'true' || item.properties.mup === true)
      );
      for (const levyItem of levyItems) {
        await removeMupLevy(levyItem);
      }
      isProcessing = false;
      return;
    }

    // Customer is in Scotland - disable buttons during MUP processing
    console.log('[MUP Levy] Customer in Scotland - disabling buttons during MUP processing');
    setAtcButtonsState(true);

    const settings = await getMupSettings();
    if (!settings || !settings.enforcementEnabled) {
      isProcessing = false;
      setAtcButtonsState(false);
      return;
    }

    // Build a set of all parent variant IDs in the cart
    const parentVariantIds = new Set();
    for (const item of cartData.items) {
      // Skip levy items themselves
      if (item.properties && (item.properties.mup === 'true' || item.properties.mup === true)) {
        continue;
      }
      parentVariantIds.add(String(item.variant_id));
    }

    // First pass: Remove orphaned levy items (levy items whose parent is no longer in cart)
    const levyItems = cartData.items.filter(item => 
      item.properties && (item.properties.mup === 'true' || item.properties.mup === true)
    );
    
    for (const levyItem of levyItems) {
      const parentId = levyItem.properties.parent_line_id;
      if (!parentVariantIds.has(parentId)) {
        console.log('[MUP Levy] Removing orphaned levy item (parent removed):', levyItem.key);
        await removeMupLevy(levyItem);
      }
    }

    // Second pass: Process each cart item for MUP requirements
    for (const item of cartData.items) {
      // Skip levy items themselves
      if (item.properties && (item.properties.mup === 'true' || item.properties.mup === true)) {
        continue;
      }

      const checkResult = await checkItemNeedsLevy(item);
      if (!checkResult) continue;

      // Use variant_id as parent identifier (consistent with cart transform)
      const parentLineId = String(item.variant_id);
      const existingLevy = findLevyLine(cartData.items, parentLineId);


  

      if (checkResult.needsLevy) {
        // Item needs levy
        if (!existingLevy) {
          // Add levy
          await addMupLevy(
            parentLineId,
            checkResult.levyAmount,
            item.quantity,
            checkResult.settings,
            item.product_title || ''
          );
        } else {
          // Always update levy quantity to match parent quantity
          if (existingLevy.quantity !== item.quantity) {
            console.log('[MUP Levy] Updating levy quantity to match parent:', item.quantity);
            const updateResponse = await fetch('/cart/change.js', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                id: existingLevy.key,
                quantity: item.quantity
              })
            });
            const updateResult = await updateResponse.json();
            console.log('[MUP Levy] Levy quantity updated:', updateResult);
            window.dispatchEvent(new CustomEvent('cart:updated'));
          }
        }
      } else {
        // Item no longer needs levy, remove it
        if (existingLevy) {
          await removeMupLevy(existingLevy);
          window.dispatchEvent(new CustomEvent('cart:updated'));
        }
      }
    }

    console.log('[MUP Levy] Completed MUP levy check');
    
    // Reset processing flag when done
    isProcessing = false;
    
    // If there's a pending check that came in while we were processing, handle it
    if (pendingCheck) {
      console.log('[MUP Levy] Processing pending check...');
      setTimeout(() => handleMupLevyCheck({}), 100);
    } else {
      // Re-enable ATC buttons only if no more pending checks
      setAtcButtonsState(false);
      console.log('[MUP Levy] ATC buttons re-enabled');
    }
  }

  // Handle quantity button clicks - disable for 3 seconds to prevent rapid clicking
  function handleQuantityButtonClick(event) {
    const button = event.currentTarget;
    
    // Disable the button
    button.disabled = true;
    button.style.opacity = '0.5';
    button.style.cursor = 'not-allowed';
    
    console.log('[MUP Levy] Quantity button disabled for 3 seconds');
    
    // Re-enable after 3 seconds
    setTimeout(() => {
      button.disabled = false;
      button.style.opacity = '';
      button.style.cursor = '';
      console.log('[MUP Levy] Quantity button re-enabled');
    }, 3000);
  }
  


  // Initialize MUP levy handler
  function initMupLevyHandler() {
    // Prevent multiple initializations
    if (window.mupLevyHandlerInitialized) {
      console.log('[MUP Levy] Handler already initialized, skipping');
      return;
    }

    if (!initStorefrontApi()) {
      console.warn('[MUP Levy] Storefront API not configured, MUP levy handler disabled');
      return;
    }

    // Listen to both cart events to handle additions and quantity updates
    document.addEventListener('cart:added', handleMupLevyCheck);
    document.addEventListener('cart:updated', handleMupLevyCheck);

    document.addEventListener("cart:updated", function() {
      document.querySelectorAll('.cart-item__quantity').forEach(qty => {
        qty.disabled = true;
        qty.style.opacity = '0.5';
        qty.style.pointerEvents = 'none';
      });
      setTimeout(() => {
        document.querySelectorAll('.cart-item__quantity').forEach(qty => {
          qty.disabled = false;
          qty.style.opacity = '';
          qty.style.pointerEvents = 'auto';
        });
      }, 3000);
      document.querySelectorAll('.minicart__quantity').forEach(qty => {
        qty.disabled = true;
        qty.style.opacity = '0.5';
        qty.style.pointerEvents = 'none';
      });
      setTimeout(() => {
        document.querySelectorAll('.minicart__quantity').forEach(qty => {
          qty.disabled = false;
          qty.style.opacity = '';
          qty.style.pointerEvents = 'auto';
        });
      }, 3000);
    });

    window.mupLevyHandlerInitialized = true;
    console.log('[MUP Levy] Handler initialized');
  }

  

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initMupLevyHandler);
  } else {
    initMupLevyHandler();
  }
})();

