/**
 * UK Region Selector - App Block
 * 
 * This script handles the UK region selector functionality including:
 * - Geolocation detection
 * - Cookie management
 * - Cart attribute updates
 * - Modal display
 * - Auto-detection for Scotland
 */

(function() {
  'use strict';

  // Constants
  const COOKIE_NAME = "mup_region";
  const COOKIE_EXPIRY_DAYS = 180;
  const GEO_COOKIE_NAME = "mup_geo_checked";
  const GEO_COOKIE_EXPIRY_DAYS = 1;
  const SCOTLAND_COOKIE_NAME = "mup_scotland_detected";

  // Cookie utilities
  function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    
    if (parts.length === 2) {
      return parts.pop().split(';').shift();
    }
    return null;
  }

  function setCookie(name, value, days) {
    const date = new Date();
    date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
    const expires = `expires=${date.toUTCString()}`;
    document.cookie = `${name}=${value};${expires};path=/`;
  }

  // Shopify localization API
  async function getUsersBrowsingLocale() {
    try {
      const response = await fetch('/browsing_context_suggestions.json');
      return await response.json();
    } catch (error) {
      console.warn('[UK Region Selector] Failed to fetch browsing context:', error);
      return null;
    }
  }

  // Check if user is in UK
  async function checkGeolocation() {
    const geoChecked = getCookie(GEO_COOKIE_NAME);
    const cachedUKStatus = getCookie("mup_is_uk");
    
    if (geoChecked && cachedUKStatus !== null) {
      return cachedUKStatus === "true";
    }

    try {
      const browsingContext = await getUsersBrowsingLocale();
      
      let isInUK = false;
      if (browsingContext && browsingContext.detected_values) {
        const detectedCountry = browsingContext.detected_values.country?.handle?.toLowerCase();
        isInUK = detectedCountry === 'gb' || detectedCountry === 'uk';
      } else {
        isInUK = window.Shopify?.country?.toLowerCase() === 'gb';
      }

      setCookie(GEO_COOKIE_NAME, "checked", GEO_COOKIE_EXPIRY_DAYS);
      setCookie("mup_is_uk", isInUK.toString(), GEO_COOKIE_EXPIRY_DAYS);
      
      return isInUK;
    } catch (error) {
      console.warn('[UK Region Selector] Geolocation error:', error);
      const isInUK = window.Shopify?.country?.toLowerCase() === 'gb';
      setCookie(GEO_COOKIE_NAME, "checked", GEO_COOKIE_EXPIRY_DAYS);
      setCookie("mup_is_uk", isInUK.toString(), GEO_COOKIE_EXPIRY_DAYS);
      return isInUK;
    }
  }

  // Set cart attribute
  async function setCartAttribute(region) {
    try {
      const response = await fetch('/cart/update.js', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          attributes: {
            uk_region: region,
            _uk_region_updated: new Date().toISOString()
          }
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to update cart: ${response.status}`);
      }

      const cart = await response.json();

      document.dispatchEvent(new CustomEvent('cart:updated', { 
        detail: cart 
      }));

      document.dispatchEvent(new CustomEvent('uk:region-changed', {
        detail: { region },
        bubbles: true,
        composed: true
      }));

      return cart;
    } catch (error) {
      console.error('[UK Region Selector] Failed to set cart attribute:', error);
      throw error;
    }
  }

  // Trigger cart transform by updating cart
  async function triggerCartTransform() {
    try {
      // Get current cart
      const cartResponse = await fetch('/cart.js');
      const cart = await cartResponse.json();
      
      if (cart.items && cart.items.length > 0) {
        // Update first item quantity to same value to trigger cart transform
        const firstItem = cart.items[0];
        await fetch('/cart/change.js', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: firstItem.key,
            quantity: firstItem.quantity
          })
        });
        console.log('[UK Region Selector] Cart transform triggered');
      }
    } catch (error) {
      console.error('[UK Region Selector] Failed to trigger cart transform:', error);
    }
  }

  // Ensure cart attribute exists
  async function ensureCartAttributeExists(region) {
    try {
      const cartResponse = await fetch('/cart.js');
      if (!cartResponse.ok) {
        throw new Error(`Failed to fetch cart: ${cartResponse.status}`);
      }
      
      const cart = await cartResponse.json();
      const currentRegion = cart.attributes?.uk_region;
      
      if (!currentRegion || currentRegion !== region) {
        await setCartAttribute(region);
      }
    } catch (error) {
      console.error('[UK Region Selector] Cart attribute error:', error);
      await setCartAttribute(region);
    }
  }

  // Detect subdivision with fallback API
  async function detectWithFallbackAPI() {
    try {
      const response = await fetch('https://ipapi.co/json/');
      if (!response.ok) {
        throw new Error(`Fallback API failed: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.country_code !== 'GB') {
        return null;
      }

      const region = data.region?.toLowerCase();
      
      if (region === 'scotland') {
        return 'SCT';
      } else if (region === 'england') {
        return 'ENG';
      } else if (region === 'wales') {
        return 'WLS';
      } else if (region === 'northern ireland') {
        return 'NIR';
      }

      return null;
    } catch (error) {
      console.error('[UK Region Selector] Fallback API error:', error);
      throw error;
    }
  }

  // Detect subdivision with MaxMind
  async function detectSubdivisionWithMaxMind(accountId, licenseKey) {
    if (!accountId || !licenseKey) {
      return await detectWithFallbackAPI();
    }

    try {
      const response = await fetch(`https://geoip.maxmind.com/geoip/v2.1/city/me`, {
        headers: {
          'Authorization': 'Basic ' + btoa(`${accountId}:${licenseKey}`)
        }
      });

      if (!response.ok) {
        return await detectWithFallbackAPI();
      }

      const data = await response.json();
      const subdivision = data?.subdivisions?.[0]?.iso_code || null;
      
      if (!subdivision) {
        return await detectWithFallbackAPI();
      }
      
      return subdivision;
    } catch (error) {
      return await detectWithFallbackAPI();
    }
  }

  // Auto-detect Scotland
  async function autoDetectScotland(accountId, licenseKey) {
    const cachedDetection = getCookie(SCOTLAND_COOKIE_NAME);
    
    if (cachedDetection !== null) {
      const isScotland = cachedDetection === "true";
      const region = isScotland ? 'scotland' : 'england';
      
      setCookie(COOKIE_NAME, region, COOKIE_EXPIRY_DAYS);
      await setCartAttribute(region);
      return { detected: true, region };
    }

    try {
      const subdivision = await detectSubdivisionWithMaxMind(accountId, licenseKey);
      
      if (subdivision) {
        const isScotland = subdivision.toLowerCase() === 'sct' || subdivision.toLowerCase() === 'scotland';
        
        setCookie(SCOTLAND_COOKIE_NAME, isScotland.toString(), GEO_COOKIE_EXPIRY_DAYS);
        
        const region = isScotland ? 'scotland' : 'england';
        setCookie(COOKIE_NAME, region, COOKIE_EXPIRY_DAYS);
        await setCartAttribute(region);
        return { detected: true, region };
      } else {
        throw new Error('Could not detect subdivision');
      }
    } catch (error) {
      console.warn('[UK Region Selector] Auto-detection failed:', error);
      return { detected: false };
    }
  }

  // Initialize region selector
  async function initializeRegionSelector(container) {
    const detectionMethod = container.dataset.detectionMethod || 'manual';
    const maxmindAccountId = container.dataset.maxmindAccountId;
    const maxmindLicenseKey = container.dataset.maxmindLicenseKey;
    const showModal = container.dataset.showModal === 'true';
    const blockId = container.dataset.blockId;

    const isInUK = await checkGeolocation();

    if (!isInUK) {
      container.style.display = 'none';
      return;
    }

    const select = container.querySelector('[data-region-select]');
    const modal = document.getElementById(`uk-region-modal-${blockId}`);
    const modalSelect = modal?.querySelector('[data-modal-select]');
    const modalSubmit = modal?.querySelector('[data-modal-submit]');
    const modalCloseButtons = modal?.querySelectorAll('[data-modal-close]');

    if (detectionMethod === 'auto') {
      const result = await autoDetectScotland(maxmindAccountId, maxmindLicenseKey);
      
      if (result.detected) {
        container.style.display = 'none';
        return;
      }
      // If auto-detection failed, fall through to manual mode
    }

    // Manual mode or auto-detection fallback
    container.style.display = 'flex';

    const savedRegion = getCookie(COOKIE_NAME);

    if (savedRegion) {
      if (select) select.value = savedRegion;
      await ensureCartAttributeExists(savedRegion);
    } else {
      if (select) select.value = 'england';
      
      if (showModal && modal) {
        setTimeout(() => {
          modal.style.display = 'flex';
          document.body.style.overflow = 'hidden';
        }, 500);
      }
    }

    // Handle selector change
    if (select) {
      select.addEventListener('change', async (e) => {
        const region = e.target.value;
        setCookie(COOKIE_NAME, region, COOKIE_EXPIRY_DAYS);
        await setCartAttribute(region);
        
        // Sync all selectors on page
        document.querySelectorAll('[data-region-select]').forEach(s => {
          s.value = region;
        });
        
        // If changed to Scotland, trigger cart transform to add MUP
        if (region === 'scotland') {
          console.log('[UK Region Selector] Changed to Scotland - triggering MUP cart transform...');
          await triggerCartTransform();
          console.log('[UK Region Selector] Reloading page to show MUP...');
          window.location.reload();
        }
      });
    }

    // Handle modal
    if (modal) {
      // Enable submit when region selected
      if (modalSelect && modalSubmit) {
        modalSelect.addEventListener('change', () => {
          modalSubmit.disabled = !modalSelect.value;
        });

        modalSubmit.addEventListener('click', async () => {
          const region = modalSelect.value;
          if (region) {
            setCookie(COOKIE_NAME, region, COOKIE_EXPIRY_DAYS);
            await setCartAttribute(region);
            
            // Update all selectors
            document.querySelectorAll('[data-region-select]').forEach(s => {
              s.value = region;
            });
            
            // Close modal
            modal.style.display = 'none';
            document.body.style.overflow = '';
            
            // If changed to Scotland, trigger cart transform to add MUP
            if (region === 'scotland') {
              console.log('[UK Region Selector] Changed to Scotland - triggering MUP cart transform...');
              await triggerCartTransform();
              console.log('[UK Region Selector] Reloading page to show MUP...');
              window.location.reload();
            }
          }
        });
      }

      // Handle close buttons
      if (modalCloseButtons) {
        modalCloseButtons.forEach(button => {
          button.addEventListener('click', () => {
            modal.style.display = 'none';
            document.body.style.overflow = '';
          });
        });
      }

      // Handle escape key
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modal.style.display === 'flex') {
          modal.style.display = 'none';
          document.body.style.overflow = '';
        }
      });

      // Prevent closing on content click
      const modalContent = modal.querySelector('.uk-region-modal__content');
      if (modalContent) {
        modalContent.addEventListener('click', (e) => {
          e.stopPropagation();
        });
      }
    }
  }

  // Initialize all region selectors on the page
  function init() {
    const selectors = document.querySelectorAll('.uk-region-selector-app-block');
    selectors.forEach(selector => {
      initializeRegionSelector(selector);
    });
  }

  // Run on DOMContentLoaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Also listen for section rendering events (for Online Store 2.0)
  document.addEventListener('shopify:section:load', (event) => {
    const container = event.target.querySelector('.uk-region-selector-app-block');
    if (container) {
      initializeRegionSelector(container);
    }
  });

  // ============================================================================
  // MUP DISCOUNT OVERRIDE DETECTION
  // ============================================================================
  // This runs on the cart page to detect if an override discount code is applied.
  // If detected, it sets a cart attribute that the validation function can read.
  
async function checkForOverrideDiscount() {
  try {
    // Fetch current cart
    const cartResponse = await fetch('/cart.js');
    const cart = await cartResponse.json();
    
    console.log('[MUP Override] Checking cart for discounts...', {
      pathname: window.location.pathname,
      cartItemCount: cart.item_count
    });
    
    // Skip if cart is empty
    if (!cart.item_count || cart.item_count === 0) {
      console.log('[MUP Override] Cart is empty, skipping');
      return;
    }
    
    // Check if there's already an override attribute set
    const hasOverrideAttr = cart.attributes && cart.attributes.mup_override === 'true';
    
    // Get applied discount codes (if any)
    const appliedCodes = [];
    
    // Log cart structure for debugging
    console.log('[MUP Override] Cart structure:', {
      hasDiscount: !!cart.discount,
      hasCartLevelDiscounts: !!cart.cart_level_discount_applications,
      discountApplications: cart.cart_level_discount_applications,
      attributes: cart.attributes,
      totalDiscount: cart.total_discount
    });
    
    // Check cart_level_discount_applications (most reliable in newer Shopify versions)
    if (cart.cart_level_discount_applications && cart.cart_level_discount_applications.length > 0) {
      cart.cart_level_discount_applications.forEach(discount => {
        if (discount.title) {
          appliedCodes.push(discount.title);
          console.log('[MUP Override] Found discount from cart_level_discount_applications:', discount.title);
        }
      });
    }
    
    // Check for discount in cart object (older format)
    if (cart.discount) {
      const code = cart.discount.code || cart.discount;
      if (code) {
        appliedCodes.push(code);
        console.log('[MUP Override] Found discount from cart.discount:', code);
      }
    }
    
    // Also check URL params for discount code
    const urlParams = new URLSearchParams(window.location.search);
    const urlDiscount = urlParams.get('discount');
    if (urlDiscount) {
      appliedCodes.push(urlDiscount);
      console.log('[MUP Override] Found discount from URL:', urlDiscount);
    }
    
    // Check cart attributes for stored discount codes
    if (cart.attributes && cart.attributes.discount_code) {
      appliedCodes.push(cart.attributes.discount_code);
      console.log('[MUP Override] Found discount from cart attributes:', cart.attributes.discount_code);
    }

    console.log('[MUP Override] All detected discount codes:', appliedCodes);

      // If no codes applied and override attribute exists, remove it
      if (appliedCodes.length === 0 && hasOverrideAttr) {
        console.log('[MUP Override] No discount codes applied, removing override attribute');
        await fetch('/cart/update.js', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            attributes: {
              mup_override: '',
              _mup_override_removed: new Date().toISOString()
            }
          })
        });
        return;
      }

      // If no codes applied, nothing to do
      if (appliedCodes.length === 0) {
        return;
      }

      // Fetch override codes from shop metafield
      // Since we can't easily access metafields from frontend, we'll hardcode for now
      // TODO: Expose override codes via a /apps/mup/override-codes endpoint
      const overrideCodes = await fetchOverrideCodes();
      
      console.log('[MUP Override] Configured override codes:', overrideCodes);

    // Normalize override codes to uppercase for case-insensitive comparison
    const normalizedOverrideCodes = overrideCodes.map(code => code.toUpperCase().trim());

    // Check if any applied code is an override code
    const hasOverrideCode = appliedCodes.some(code => {
      const normalizedCode = code.toUpperCase().trim();
      return normalizedOverrideCodes.includes(normalizedCode);
    });

    console.log('[MUP Override] Has override code:', hasOverrideCode);

    // Set or remove the override attribute based on whether we detected an override code
    if (hasOverrideCode && !hasOverrideAttr) {
      console.log('[MUP Override] Setting override attribute');
      await fetch('/cart/update.js', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          attributes: {
            mup_override: 'true',
            _mup_override_set: new Date().toISOString()
          }
        })
      });
      
      // If on checkout page, clear stale errors by returning to cart
      if (window.location.pathname.includes('/checkout') || window.location.pathname.includes('/checkouts')) {
        console.log('[MUP Override] On checkout page - redirecting to cart to clear stale errors');
        showOverrideMessage('Override code detected! Returning to cart...');
        setTimeout(() => {
          window.location.href = '/cart';
        }, 1500);
        return;
      }
      
      // Show a message to the user
      showOverrideMessage('✓ MUP enforcement bypassed - override code detected');
    } else if (!hasOverrideCode && hasOverrideAttr) {
      console.log('[MUP Override] Removing override attribute (code no longer qualifies)');
      await fetch('/cart/update.js', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          attributes: {
            mup_override: '',
            _mup_override_removed: new Date().toISOString()
          }
        })
      });
    }

    } catch (error) {
      console.error('[MUP Override] Error checking for override discount:', error);
    }
  }

// Fetch override codes from backend or use hardcoded list

async function fetchOverrideCodes() {
  // Determine the correct URL based on environment
  let url;
  if (window.location.href.includes('brewdog-dev') || window.location.href.includes('--development') || window.location.href.includes('localhost') || window.location.href.includes('127.0.0.1')) {
    url = 'https://brewdog--development.gadget.app/apps/mup/override-codes';
  } else {
    url = 'https://brewdog.gadget.app/apps/mup/override-codes';
  }
  
  // Get shop domain
  const shopDomain = window.Shopify?.shop || window.location.hostname;
  
  try {
    // Attempt to fetch from the Gadget app endpoint with cache-busting and shop domain
    const params = new URLSearchParams({
      t: Date.now().toString()
    });
    if (shopDomain) {
      params.append('shopDomain', shopDomain);
    }
    const response = await fetch(`${url}?${params.toString()}`, {
      method: 'GET',
      headers: {
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      }
    });

    if (response.ok) {
      const data = await response.json();
      console.log('[MUP Override] Response from endpoint:', data);
      if (data.success && data.codes && Array.isArray(data.codes) && data.codes.length > 0) {
        console.log('[MUP Override] Fetched override codes from backend:', data.codes);
        return data.codes;
      } else {
        console.warn('[MUP Override] Endpoint returned empty or invalid codes:', data);
      }
    } else {
      console.error('[MUP Override] Endpoint returned error status:', response.status, response.statusText);
    }
  } catch (error) {
    console.error('[MUP Override] Could not fetch override codes from endpoint, using defaults:', error);
  }

  // Fallback to hardcoded list
  // IMPORTANT: Update this list to match your configured override codes
  console.log('[MUP Override] Using hardcoded fallback list');
  return [
    'CS100',
    'STAFF40',
    'STAFF50',
    'INTERNAL',
    'OVERRIDE',
    'BEERDROPNOVEMBER2025'
    // TODO: Add all other override codes here until endpoint is deployed
  ];
}

  // Show a message to the user
  function showOverrideMessage(message) {
    // Create a simple notification banner
    const banner = document.createElement('div');
    banner.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #4CAF50;
      color: white;
      padding: 16px 24px;
      border-radius: 4px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.2);
      z-index: 9999;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      font-size: 14px;
    `;
    banner.textContent = message;
    document.body.appendChild(banner);

    // Auto-remove after 3 seconds
    setTimeout(() => {
      banner.style.transition = 'opacity 0.3s';
      banner.style.opacity = '0';
      setTimeout(() => banner.remove(), 300);
    }, 3000);
  }

  // Intercept checkout button clicks to ensure override attribute is set
  function interceptCheckoutButtons() {
    console.log('[MUP Override] Setting up checkout button interceptors');
    
    // Common checkout button selectors
    const checkoutSelectors = [
      'button[name="checkout"]',
      'input[name="checkout"]',
      '[href*="/checkouts"]',
      '.cart__checkout-button',
      '[data-testid="Checkout-button"]',
      'button[type="submit"][name="checkout"]',
      'a[href="/checkout"]'
    ];
    
    checkoutSelectors.forEach(selector => {
      document.querySelectorAll(selector).forEach(button => {
        button.addEventListener('click', async (e) => {
          console.log('[MUP Override] Checkout button clicked - ensuring override attribute is set');
          
          // Run override detection synchronously before checkout
          try {
            await checkForOverrideDiscount();
            console.log('[MUP Override] Override check complete, allowing checkout');
          } catch (error) {
            console.error('[MUP Override] Error during pre-checkout override check:', error);
          }
        }, true); // Use capture phase
      });
    });
  }

  // Run override check on ALL pages (cart, product, checkout, etc.)
  // This ensures the mup_override attribute is set before validation runs
  function initOverrideDetection() {
    console.log('[MUP Override] Initializing override detection on:', window.location.pathname);
    
    // Run immediately
    checkForOverrideDiscount();
    
    // Check multiple times with delays to catch async discount applications
    setTimeout(checkForOverrideDiscount, 300);
    setTimeout(checkForOverrideDiscount, 800);
    setTimeout(checkForOverrideDiscount, 1500);
    setTimeout(checkForOverrideDiscount, 3000);
    
    // Set up checkout button interceptors
    setTimeout(interceptCheckoutButtons, 500);
    setTimeout(interceptCheckoutButtons, 2000); // Again after potential dynamic content loads
    
    // Also listen for cart updates
    document.addEventListener('cart:updated', () => {
      checkForOverrideDiscount();
      // Re-setup interceptors after cart updates
      setTimeout(interceptCheckoutButtons, 100);
    });
    
    // Listen for page focus (user coming back to tab)
    window.addEventListener('focus', checkForOverrideDiscount);
    
    // Listen for DOM mutations to catch dynamically added checkout buttons
    const observer = new MutationObserver(() => {
      interceptCheckoutButtons();
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }
  
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initOverrideDetection);
  } else {
    initOverrideDetection();
  }

})();

