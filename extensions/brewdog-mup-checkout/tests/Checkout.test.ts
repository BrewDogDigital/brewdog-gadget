/// <reference types="@shopify/ui-extensions/purchase.checkout.block.render" />

import {fireEvent, waitFor} from '@testing-library/preact';
import {getExtension} from '@shopify/ui-extensions-tester';
import {
  createCartLine,
  createResult,
} from '@shopify/ui-extensions-tester/checkout';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';

const extension = getExtension('purchase.checkout.block.render');

function addressSignal(zip?: string) {
  return {
    value: zip ? {zip} : undefined,
    subscribe: vi.fn(() => () => {}),
  };
}

beforeEach(() => {
  vi.resetModules();
  extension.setUp();
  // Address APIs require protected customer data, so the official tester
  // intentionally omits them from its standard checkout mock.
  Object.defineProperties(extension.shopify, {
    billingAddress: {
      configurable: true,
      value: addressSignal(),
    },
    shippingAddress: {
      configurable: true,
      value: addressSignal(),
    },
  });
  extension.shopify.lines.value = [createCartLine()];
  extension.shopify.attributes.value = [];
  extension.shopify.discountCodes.value = [];
});

afterEach(() => {
  extension.tearDown();
});

describe('MUP checkout guidance', () => {
  it('renders nothing outside Scotland', async () => {
    extension.shopify.attributes.value = [{key: 'uk_region', value: 'england'}];

    await extension.render();

    expect(document.body.textContent).toBe('');
  });

  it('warns when a Scottish address conflicts with the selected region', async () => {
    extension.shopify.attributes.value = [{key: 'uk_region', value: 'england'}];
    extension.shopify.shippingAddress!.value = {zip: 'EH1 1AA'} as never;

    await extension.render();

    expect(document.body.textContent).toContain('Scottish Address Detected');
    expect(document.body.textContent).toContain('Select "Scotland" as your region');
  });

  it('shows discount guidance for Scotland without an override', async () => {
    extension.shopify.attributes.value = [{key: 'uk_region', value: 'scotland'}];
    extension.shopify.discountCodes.value = [{code: 'SAVE10'}];

    await extension.render();

    expect(document.body.textContent).toContain('Possible MUP Violation');
    expect(document.body.textContent).toContain('Remove Discount Code');
  });

  it('shows override success and suppresses discount guidance', async () => {
    extension.shopify.attributes.value = [
      {key: 'uk_region', value: 'scotland'},
      {key: 'mup_override', value: 'true'},
    ];
    extension.shopify.discountCodes.value = [{code: 'STAFF50'}];

    await extension.render();

    expect(document.body.textContent).toContain('Override Code Detected');
    expect(document.body.textContent).not.toContain('Possible MUP Violation');
  });

  it('removes every applied discount code', async () => {
    extension.shopify.attributes.value = [{key: 'uk_region', value: 'scotland'}];
    extension.shopify.discountCodes.value = [
      {code: 'SAVE10'},
      {code: 'SAVE20'},
    ];
    const applyDiscountCodeChange = vi
      .fn()
      .mockResolvedValue(createResult('applyDiscountCodeChange'));
    extension.shopify.applyDiscountCodeChange = applyDiscountCodeChange;

    await extension.render();

    const button = document.body.querySelector('s-button');
    expect(button).not.toBeNull();
    fireEvent.click(button!);

    await waitFor(() => {
      expect(applyDiscountCodeChange).toHaveBeenCalledTimes(2);
    });
    expect(applyDiscountCodeChange).toHaveBeenNthCalledWith(1, {
      type: 'removeDiscountCode',
      code: 'SAVE10',
    });
    expect(applyDiscountCodeChange).toHaveBeenNthCalledWith(2, {
      type: 'removeDiscountCode',
      code: 'SAVE20',
    });
  });
});
