import { useState, useEffect } from "react";
import { Page, Card, TextField, Button, InlineStack, Text, Banner, Spinner } from "@shopify/polaris";
import { useFindFirst } from "@gadgetinc/react";
import { api } from "../api";
import React from "react";

export default function MupSettingsPage() {
  const [levyVariantId, setLevyVariantId] = useState("");
  const [minimumUnitPrice, setMinimumUnitPrice] = useState("0.65");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Fetch current shop settings
  const [{ data: shopData, fetching: loadingShop }] = useFindFirst(api.shopifyShop, {
    select: {
      id: true,
      mupLevyProduct: { key: true, value: true },
      minimumUnitPrice: { key: true, value: true },
    },
  });

  // Populate form when shop data loads
  useEffect(() => {
    if (shopData) {
      // Use type assertion to access custom fields safely
      const mupLevyProduct = (shopData as any).mupLevyProduct;
      if (mupLevyProduct?.value) {
        setLevyVariantId(mupLevyProduct.value);
      }
  
      if ((shopData as any).minimumUnitPrice?.value) {
        setMinimumUnitPrice((shopData as any).minimumUnitPrice.value);
      }
    }
  }, [shopData]);

  const onSave = async () => {
    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      await api.saveMupSettings({ levyVariantId, minimumUnitPrice });
      setMessage("✅ Settings saved successfully!");
    } catch (e: any) {
      setError(e.message || String(e));
    } finally {
      setSaving(false);
    }
  };

  if (loadingShop) {
    return (
      <Page title="Minimum Unit Pricing">
        <Card>
          <div style={{ display: "flex", justifyContent: "center", padding: "2rem" }}>
            <Spinner accessibilityLabel="Loading settings" size="large" />
          </div>
        </Card>
      </Page>
    );
  }

  return (
    <Page title="Minimum Unit Pricing">
      <Card>
        <InlineStack gap="400" align="start">
          <div style={{ minWidth: 360 }}>
            <Text as="h2" variant="headingMd">Settings</Text>
            <div style={{ marginTop: 16 }}>
              <TextField
                label="Levy product variant ID"
                value={levyVariantId}
                onChange={setLevyVariantId}
                autoComplete="off"
                helpText="Product variant used to add levy child lines"
              />
            </div>
            <div style={{ marginTop: 16 }}>
              <TextField
                label="Minimum unit price (£ per unit)"
                value={minimumUnitPrice}
                onChange={setMinimumUnitPrice}
                type="number"
                autoComplete="off"
                helpText="e.g. 0.65"
              />
            </div>
            <div style={{ marginTop: 16 }}>
              <Button variant="primary" loading={saving} onClick={onSave}>
                Save
              </Button>
            </div>
            {message && (
              <div style={{ marginTop: 8 }}>
                <Text as="p" variant="bodyMd">{message}</Text>
              </div>
            )}
            {error && (
              <div style={{ marginTop: 8 }}>
                <Banner tone="critical">
                  <Text as="p" variant="bodyMd">Error: {error}</Text>
                </Banner>
              </div>
            )}
          </div>
        </InlineStack>
      </Card>
    </Page>
  );
}


