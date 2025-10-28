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

})();

