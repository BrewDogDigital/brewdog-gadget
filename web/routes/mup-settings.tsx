import { useState, useEffect } from "react";
import { Page, Card, TextField, Button, InlineStack, Text, Banner, Spinner, BlockStack, Link, Checkbox, Divider } from "@shopify/polaris";
import { useFindFirst } from "@gadgetinc/react";
import { api } from "../api";
import React from "react";

export default function MupSettingsPage() {
  const [levyVariantId, setLevyVariantId] = useState("");
  const [minimumUnitPrice, setMinimumUnitPrice] = useState("0.65");
  const [enforcementEnabled, setEnforcementEnabled] = useState(true);
  const [geoipEnabled, setGeoipEnabled] = useState(false);
  const [saving, setSaving] = useState(false);
  const [creatingLevy, setCreatingLevy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Fetch current shop settings
  const [{ data: shopData, fetching: loadingShop }] = useFindFirst(api.shopifyShop, {
    select: {
      id: true,
    },
  });

  // Load settings from the backend when component mounts
  const loadSettings = async () => {
    if (!shopData?.id) return;
    
    try {
      const result = await (api as any).getMupSettings({});
      if (result.success && result.settings) {
        setLevyVariantId(result.settings.levyVariantId || "");
        setMinimumUnitPrice(result.settings.minimumUnitPrice || "0.65");
        setEnforcementEnabled(result.settings.enforcementEnabled !== false);
        setGeoipEnabled(result.settings.geoipEnabled || false);
      }
    } catch (e) {
      console.error("Error loading settings:", e);
    }
  };

  useEffect(() => {
    loadSettings();
  }, [shopData?.id]);

  const onSave = async () => {
    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      await api.saveMupSettings({ 
        levyVariantId, 
        minimumUnitPrice,
        enforcementEnabled,
        geoipEnabled,
      });
      setMessage("✅ Settings saved successfully!");
    } catch (e: any) {
      setError(e.message || String(e));
    } finally {
      setSaving(false);
    }
  };

  const onCreateLevyProduct = async () => {
    setCreatingLevy(true);
    setMessage(null);
    setError(null);
    try {
      const result = await (api as any).createMupLevyProduct({});
      const newVariantId = result.product.variantId;
      setLevyVariantId(newVariantId);
      
      // Automatically save the new variant ID
      await api.saveMupSettings({ 
        levyVariantId: newVariantId, 
        minimumUnitPrice,
        enforcementEnabled,
        geoipEnabled,
      });
      
      setMessage(`✅ Levy product created and saved! Product: "${result.product.title}"`);
    } catch (e: any) {
      setError(e.message || String(e));
    } finally {
      setCreatingLevy(false);
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
    <Page 
      title="Minimum Unit Pricing"
      secondaryActions={[
        {
          content: "Health Check",
          url: "/mup-health-check",
        },
        {
          content: "Setup Metafields",
          onAction: async () => {
            try {
              await (api as any).setupMupMetafields({});
              setMessage("✅ Metafield definitions created successfully!");
            } catch (e: any) {
              setError(e.message || String(e));
            }
          },
        },
      ]}
    >
      <BlockStack gap="400">
        <Banner tone="info">
          <Text as="p">
            Configure MUP settings for Scotland compliance. <Link url="/mup-health-check">Run a health check</Link> to scan products for missing alcohol unit data.
          </Text>
        </Banner>
        
        <Card>
          <BlockStack gap="400">
            <Text as="h2" variant="headingMd">Enforcement Settings</Text>
            
            <Checkbox
              label="Enable MUP Enforcement"
              checked={enforcementEnabled}
              onChange={setEnforcementEnabled}
              helpText="When enabled, MUP rules will be enforced for Scotland customers"
            />
            
            <Checkbox
              label="Enable GeoIP Detection"
              checked={geoipEnabled}
              onChange={setGeoipEnabled}
              helpText="Automatically detect customer location using GeoIP (experimental)"
            />
            
            <Divider />
            
            <Text as="h2" variant="headingMd">Pricing Configuration</Text>
            
            <TextField
              label="Minimum unit price (£ per unit)"
              value={minimumUnitPrice}
              onChange={setMinimumUnitPrice}
              type="number"
              autoComplete="off"
              helpText="e.g. 0.65 (default for Scotland)"
            />
            
            <BlockStack gap="200">
              <TextField
                label="Levy product variant ID"
                value={levyVariantId}
                onChange={setLevyVariantId}
                autoComplete="off"
                helpText="Product variant ID used to add levy child lines"
                connectedRight={
                  <Button
                    loading={creatingLevy}
                    onClick={onCreateLevyProduct}
                    disabled={saving}
                  >
                    Create Levy Product
                  </Button>
                }
              />
              <Text as="p" variant="bodySm" tone="subdued">
                Don't have a levy product? Click "Create Levy Product" to automatically create one and configure it.
              </Text>
            </BlockStack>
            
            <Divider />
            
            <InlineStack gap="200">
              <Button variant="primary" loading={saving} onClick={onSave}>
                Save Settings
              </Button>
            </InlineStack>
            
            {message && (
              <Banner tone="success">
                <Text as="p" variant="bodyMd">{message}</Text>
              </Banner>
            )}
            {error && (
              <Banner tone="critical">
                <Text as="p" variant="bodyMd">Error: {error}</Text>
              </Banner>
            )}
          </BlockStack>
        </Card>
      </BlockStack>
    </Page>
  );
}


