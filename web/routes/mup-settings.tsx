import { useState, useEffect } from "react";
import { Page, Card, TextField, Button, InlineStack, Text, Banner, Spinner, BlockStack, Link as PolarisLink, Checkbox, Divider } from "@shopify/polaris";
import { useFindFirst } from "@gadgetinc/react";
import { useNavigate, Link } from "react-router-dom";
import { api } from "../api";
import React from "react";

export default function MupSettingsPage() {
  const navigate = useNavigate();
  const [levyVariantId, setLevyVariantId] = useState("");
  const [minimumUnitPrice, setMinimumUnitPrice] = useState("0.65");
  const [enforcementEnabled, setEnforcementEnabled] = useState(true);
  const [geoipEnabled, setGeoipEnabled] = useState(false);
  const [maxmindAccountId, setMaxmindAccountId] = useState("");
  const [maxmindLicenseKey, setMaxmindLicenseKey] = useState("");
  const [overrideCodes, setOverrideCodes] = useState<string[]>([]);
  const [newCodeInput, setNewCodeInput] = useState("");
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
        setMaxmindAccountId(result.settings.maxmindAccountId || "");
        setMaxmindLicenseKey(result.settings.maxmindLicenseKey || "");
        
        // Parse override codes from string to array
        const codesString = result.settings.overrideCodes || "";
        const codesArray = codesString
          .split(/[,\n]+/)
          .map((code: string) => code.trim())
          .filter((code: string) => code.length > 0);
        setOverrideCodes(codesArray);
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
      // Convert override codes array back to comma-separated string
      const overrideCodesString = overrideCodes.join(',');
      
      await (api as any).saveMupSettings({ 
        levyVariantId, 
        minimumUnitPrice,
        enforcementEnabled,
        geoipEnabled,
        maxmindAccountId,
        maxmindLicenseKey,
        overrideCodes: overrideCodesString,
      });
      setMessage("✅ Settings saved successfully!");
    } catch (e: any) {
      setError(e.message || String(e));
    } finally {
      setSaving(false);
    }
  };

  const addOverrideCode = () => {
    const code = newCodeInput.trim();
    
    if (!code) {
      setError("Please enter a discount code");
      return;
    }
    
    if (overrideCodes.includes(code)) {
      setError(`Code "${code}" already exists`);
      return;
    }
    
    setOverrideCodes([...overrideCodes, code]);
    setNewCodeInput("");
    setError(null);
  };

  const removeOverrideCode = (codeToRemove: string) => {
    setOverrideCodes(overrideCodes.filter(code => code !== codeToRemove));
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
      const overrideCodesString = overrideCodes.join(',');
      await (api as any).saveMupSettings({ 
        levyVariantId: newVariantId, 
        minimumUnitPrice,
        enforcementEnabled,
        geoipEnabled,
        maxmindAccountId,
        maxmindLicenseKey,
        overrideCodes: overrideCodesString,
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
          content: "Documentation",
          onAction: () => navigate("/mup-documentation"),
        },
        {
          content: "Health Check",
          onAction: () => navigate("/mup-health-check"),
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
            Configure MUP settings for Scotland compliance. <Link to="/mup-health-check">Run a health check</Link> to scan products for missing alcohol unit data. 
            View the <Link to="/mup-documentation">complete documentation</Link> for setup guides and troubleshooting.
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
              helpText="Automatically detect customer location using MaxMind GeoIP"
            />
            
            {geoipEnabled && (
              <BlockStack gap="300">
                <TextField
                  label="MaxMind Account ID"
                  value={maxmindAccountId}
                  onChange={setMaxmindAccountId}
                  autoComplete="off"
                  helpText="Your MaxMind account ID (e.g., 1237981)"
                  placeholder="Enter MaxMind Account ID"
                />
                
                <TextField
                  label="MaxMind License Key"
                  value={maxmindLicenseKey}
                  onChange={setMaxmindLicenseKey}
                  autoComplete="off"
                  type="password"
                  helpText="Your MaxMind license key for GeoIP API access"
                  placeholder="Enter MaxMind License Key"
                />
                
                <Banner tone="info">
                  <Text as="p" variant="bodySm">
                    MaxMind GeoIP2 credentials are required for automatic location detection. <PolarisLink url="https://www.maxmind.com/en/geolite2/signup" external>Sign up for a free MaxMind account</PolarisLink> to get your credentials.
                  </Text>
                </Banner>
              </BlockStack>
            )}
            
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

            <Text as="h2" variant="headingMd">Discount Override Codes</Text>
            
            <Text as="p" variant="bodySm" tone="subdued">
              Discount codes that bypass MUP enforcement. Use this for customer service codes, staff allowances, or approved promotional campaigns.
            </Text>
            
            <BlockStack gap="300">
              <InlineStack gap="200" blockAlign="end">
                <div style={{ flexGrow: 1 }}>
                  <TextField
                    label="Add new override code"
                    value={newCodeInput}
                    onChange={setNewCodeInput}
                    autoComplete="off"
                    placeholder="Enter code (e.g., CS100, STAFF50)"
                  />
                </div>
                <Button onClick={addOverrideCode}>
                  Add Code
                </Button>
              </InlineStack>
              
              {overrideCodes.length > 0 ? (
                <BlockStack gap="200">
                  <Text as="p" variant="bodyMd" fontWeight="semibold">
                    Active Override Codes ({overrideCodes.length})
                  </Text>
                  <div style={{ 
                    display: 'flex', 
                    flexWrap: 'wrap', 
                    gap: '0.5rem',
                    padding: '1rem',
                    backgroundColor: '#f6f6f7',
                    borderRadius: '8px',
                    border: '1px solid #e1e3e5'
                  }}>
                    {overrideCodes.map((code) => (
                      <div
                        key={code}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                          padding: '0.5rem 0.75rem',
                          backgroundColor: '#ffffff',
                          border: '1px solid #c9cccf',
                          borderRadius: '6px',
                          fontSize: '0.875rem',
                          fontWeight: '600',
                          fontFamily: 'monospace'
                        }}
                      >
                        <span style={{ color: '#202223' }}>{code}</span>
                        <button
                          onClick={() => removeOverrideCode(code)}
                          style={{
                            border: 'none',
                            background: 'none',
                            cursor: 'pointer',
                            padding: '0.25rem',
                            display: 'flex',
                            alignItems: 'center',
                            color: '#bf0711',
                            fontSize: '1rem',
                            lineHeight: '1'
                          }}
                          aria-label={`Remove ${code}`}
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                </BlockStack>
              ) : (
                <Banner tone="info">
                  <Text as="p" variant="bodyMd">
                    No override codes configured. Add codes above to bypass MUP enforcement for specific discount codes.
                  </Text>
                </Banner>
              )}
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


