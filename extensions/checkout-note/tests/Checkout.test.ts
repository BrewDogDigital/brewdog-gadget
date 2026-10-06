/// <reference types="@shopify/ui-extensions/purchase.checkout.block.render" />

import {waitFor} from '@testing-library/preact';
import {getExtension} from '@shopify/ui-extensions-tester';
import {createResult} from '@shopify/ui-extensions-tester/checkout';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';

const extension = getExtension('purchase.checkout.block.render');

beforeEach(() => {
  vi.resetModules();
  extension.setUp();
  extension.shopify.attributes.value = [];
  extension.shopify.settings.value = {note_title: undefined};
});

afterEach(() => {
  extension.tearDown();
});

describe('checkout note', () => {
  it('renders nothing when there is no gift message', async () => {
    const applyMetafieldChange = vi.fn();
    extension.shopify.applyMetafieldChange = applyMetafieldChange;

    await extension.render();

    expect(document.body.textContent).toBe('');
    expect(applyMetafieldChange).not.toHaveBeenCalled();
  });

  it('renders and saves the gift message as a cart metafield', async () => {
    extension.shopify.attributes.value = [
      {key: 'message', value: 'Happy birthday!'},
    ];
    extension.shopify.settings.value = {note_title: 'Your gift message'};
    const applyMetafieldChange = vi
      .fn()
      .mockResolvedValue(createResult('applyMetafieldChange'));
    extension.shopify.applyMetafieldChange = applyMetafieldChange;

    await extension.render();

    expect(document.body.textContent).toContain('Your gift message');
    expect(document.body.textContent).toContain('Happy birthday!');
    await waitFor(() => {
      expect(applyMetafieldChange).toHaveBeenCalledWith({
        type: 'updateCartMetafield',
        metafield: {
          namespace: 'move_fresh',
          key: 'gift_message',
          type: 'single_line_text_field',
          value: 'Happy birthday!',
        },
      });
    });
  });

  it('does not attempt to save when cart metafields are unavailable', async () => {
    extension.shopify.attributes.value = [
      {key: 'message', value: 'Happy birthday!'},
    ];
    extension.shopify.instructions.value = {
      ...extension.shopify.instructions.value,
      metafields: {
        ...extension.shopify.instructions.value.metafields,
        canSetCartMetafields: false,
      },
    };
    const applyMetafieldChange = vi.fn();
    extension.shopify.applyMetafieldChange = applyMetafieldChange;

    await extension.render();

    expect(document.body.textContent).toContain('Happy birthday!');
    expect(applyMetafieldChange).not.toHaveBeenCalled();
  });
});
