/**
 * MUP Error Handler
 * Intercepts add to cart errors and dispatches custom events for MUP violations
 */

(function() {
  'use strict';

  // Function to check if an error is a MUP violation
  function isMupViolationError(error) {
    if (!error) return false;
    
    const errorMessage = typeof error === 'string' ? error : (error.message || error.description || '');
    const mupKeywords = [
      'Minimum Unit Pricing',
      'MUP',
      'minimum unit price',
      'legal minimum unit price',
      'Scotland'
    ];
    
    return mupKeywords.some(keyword => 
      errorMessage.toLowerCase().includes(keyword.toLowerCase())
    );
  }

  // Function to extract error details from message
  function parseMupError(error) {
    const errorMessage = typeof error === 'string' ? error : (error.message || error.description || '');
    
    // Extract price information if available
    const priceMatch = errorMessage.match(/Current price: £([\d.]+)/i);
    const minPriceMatch = errorMessage.match(/Minimum required: £([\d.]+)/i);
    
    return {
      message: errorMessage,
      currentPrice: priceMatch ? priceMatch[1] : null,
      minimumPrice: minPriceMatch ? minPriceMatch[1] : null,
      rawError: error
    };
  }

  // Intercept fetch requests for add to cart
  const originalFetch = window.fetch;
  window.fetch = function(...args) {
    const url = args[0];
    const options = args[1] || {};
    
    // Check if this is an add to cart request
    const isAddToCart = (
      (typeof url === 'string' && (
        url.includes('/cart/add.js') ||
        url.includes('/cart/add') ||
        url.includes('/cart/change.js') ||
        url.includes('/cart/update.js')
      )) ||
      (options.method === 'POST' && options.body && (
        options.body.includes('items') ||
        options.body.includes('quantity')
      ))
    );

    if (isAddToCart) {
      return originalFetch.apply(this, args)
        .then(response => {
          // Clone the response so we can read it multiple times
          const clonedResponse = response.clone();
          
          // Check if the response indicates an error
          if (!response.ok || response.status >= 400) {
            clonedResponse.json().then(data => {
              const error = data.error || data.message || data.description || data;
              
              if (isMupViolationError(error)) {
                const errorDetails = parseMupError(error);
                
                // Dispatch custom event
                const event = new CustomEvent('mup:violation-detected', {
                  detail: {
                    error: errorDetails,
                    type: 'add-to-cart',
                    timestamp: new Date().toISOString()
                  },
                  bubbles: true,
                  cancelable: true
                });
                
                document.dispatchEvent(event);
                console.log('[MUP Error Handler] MUP violation detected:', errorDetails);
              }
            }).catch(() => {
              // If JSON parsing fails, check the response text
              clonedResponse.text().then(text => {
                if (isMupViolationError(text)) {
                  const errorDetails = parseMupError(text);
                  
                  const event = new CustomEvent('mup:violation-detected', {
                    detail: {
                      error: errorDetails,
                      type: 'add-to-cart',
                      timestamp: new Date().toISOString()
                    },
                    bubbles: true,
                    cancelable: true
                  });
                  
                  document.dispatchEvent(event);
                  console.log('[MUP Error Handler] MUP violation detected:', errorDetails);
                }
              });
            });
          }
          
          return response;
        })
        .catch(error => {
          // Handle network errors
          if (isMupViolationError(error)) {
            const errorDetails = parseMupError(error);
            
            const event = new CustomEvent('mup:violation-detected', {
              detail: {
                error: errorDetails,
                type: 'add-to-cart',
                timestamp: new Date().toISOString()
              },
              bubbles: true,
              cancelable: true
            });
            
            document.dispatchEvent(event);
            console.log('[MUP Error Handler] MUP violation detected (network error):', errorDetails);
          }
          
          throw error;
        });
    }
    
    // For non-add-to-cart requests, use original fetch
    return originalFetch.apply(this, args);
  };

  // Also listen for existing custom events that might be dispatched
  document.addEventListener('product-add-to-cart-failed', (event) => {
    const error = event.detail?.error || event.detail;
    
    if (isMupViolationError(error)) {
      const errorDetails = parseMupError(error);
      
      const mupEvent = new CustomEvent('mup:violation-detected', {
        detail: {
          error: errorDetails,
          type: 'product-add-to-cart-failed',
          originalEvent: event,
          timestamp: new Date().toISOString()
        },
        bubbles: true,
        cancelable: true
      });
      
      document.dispatchEvent(mupEvent);
      console.log('[MUP Error Handler] MUP violation detected from product-add-to-cart-failed:', errorDetails);
    }
  });

  // Listen for Shopify's native cart errors (if they dispatch events)
  document.addEventListener('cart:error', (event) => {
    const error = event.detail?.error || event.detail?.message || event.detail;
    
    if (isMupViolationError(error)) {
      const errorDetails = parseMupError(error);
      
      const mupEvent = new CustomEvent('mup:violation-detected', {
        detail: {
          error: errorDetails,
          type: 'cart-error',
          originalEvent: event,
          timestamp: new Date().toISOString()
        },
        bubbles: true,
        cancelable: true
      });
      
      document.dispatchEvent(mupEvent);
      console.log('[MUP Error Handler] MUP violation detected from cart:error:', errorDetails);
    }
  });

  console.log('[MUP Error Handler] Initialized - listening for MUP violations');
})();



