import { useState, useCallback } from "react";
import { Page, Card, Button, DataTable, Badge, Banner, Text, InlineStack, BlockStack, Spinner, EmptyState, TextField, Collapsible } from "@shopify/polaris";
import { api } from "../api";
import React from "react";

export default function MupHealthCheckPage() {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [expandedProducts, setExpandedProducts] = useState<Set<string>>(new Set());
  const [variantUpdates, setVariantUpdates] = useState<{ [key: string]: string }>({});
  const [savingVariants, setSavingVariants] = useState<Set<string>>(new Set());

  const runHealthCheck = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.mupHealthCheck({ limit: 100 });
      setResults(response.results);
      // Initialize variant updates with current values
      const updates: { [key: string]: string } = {};
      response.results?.missingDataProducts?.forEach((product: any) => {
        product.variants?.forEach((variant: any) => {
          updates[variant.variantId] = variant.unitsPerItem || '';
        });
      });
      response.results?.partialDataProducts?.forEach((product: any) => {
        product.variants?.forEach((variant: any) => {
          updates[variant.variantId] = variant.unitsPerItem || '';
        });
      });
      setVariantUpdates(updates);
    } catch (e: any) {
      setError(e.message || String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  const toggleProduct = useCallback((productId: string) => {
    setExpandedProducts(prev => {
      const next = new Set(prev);
      if (next.has(productId)) {
        next.delete(productId);
      } else {
        next.add(productId);
      }
      return next;
    });
  }, []);

  const updateVariantUnits = useCallback((variantId: string, value: string) => {
    setVariantUpdates(prev => ({
      ...prev,
      [variantId]: value
    }));
  }, []);

  const saveVariantUnits = useCallback(async (variantId: string) => {
    setSavingVariants(prev => new Set(prev).add(variantId));
    try {
      await (api as any).updateVariantMetafield({
        variantId,
        unitsPerItem: parseFloat(variantUpdates[variantId])
      });
      // Refresh health check
      await runHealthCheck();
    } catch (e: any) {
      setError(`Failed to update variant: ${e.message || String(e)}`);
    } finally {
      setSavingVariants(prev => {
        const next = new Set(prev);
        next.delete(variantId);
        return next;
      });
    }
  }, [variantUpdates, runHealthCheck]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'complete':
        return <Badge tone="success">Complete</Badge>;
      case 'partial':
        return <Badge tone="attention">Partial</Badge>;
      case 'missing':
        return <Badge tone="critical">Missing</Badge>;
      default:
        return <Badge>Unknown</Badge>;
    }
  };

  const renderSummary = () => {
    if (!results) return null;

    return (
      <Card>
        <BlockStack gap="400">
          <Text as="h2" variant="headingMd">Health Check Summary</Text>
          <InlineStack gap="600">
            <div>
              <Text as="p" variant="bodyMd" tone="subdued">Total Products</Text>
              <Text as="p" variant="headingLg">{results.totalProducts}</Text>
            </div>
            <div>
              <Text as="p" variant="bodyMd" tone="subdued">Complete Data</Text>
              <Text as="p" variant="headingLg" tone="success">{results.productsWithCompleteData}</Text>
            </div>
            <div>
              <Text as="p" variant="bodyMd" tone="subdued">Partial Data</Text>
              <Text as="p" variant="headingLg" tone="warning">{results.productsWithPartialData}</Text>
            </div>
            <div>
              <Text as="p" variant="bodyMd" tone="subdued">Missing Data</Text>
              <Text as="p" variant="headingLg" tone="critical">{results.productsMissingData}</Text>
            </div>
          </InlineStack>
        </BlockStack>
      </Card>
    );
  };

  const renderVariantRow = (variant: any) => {
    const variantId = variant.variantId;
    const isSaving = savingVariants.has(variantId);
    
    return (
      <div key={variantId} style={{ padding: '0.5rem', borderBottom: '1px solid #e1e3e5' }}>
        <InlineStack gap="400" align="space-between" blockAlign="center">
          <div style={{ flex: 1 }}>
            <Text as="p" variant="bodyMd" fontWeight="medium">{variant.variantTitle}</Text>
            {variant.sku && <Text as="p" variant="bodySm" tone="subdued">SKU: {variant.sku}</Text>}
          </div>
          <div style={{ width: '150px' }}>
            <TextField
              label=""
              type="number"
              value={variantUpdates[variantId] || ''}
              onChange={(value) => updateVariantUnits(variantId, value)}
              placeholder="Units per item"
              autoComplete="off"
              step="0.1"
              min="0"
            />
          </div>
          <Button
            onClick={() => saveVariantUnits(variantId)}
            loading={isSaving}
            disabled={!variantUpdates[variantId] || isSaving}
          >
            Save
          </Button>
        </InlineStack>
      </div>
    );
  };

  const renderMissingDataTable = () => {
    if (!results || results.missingDataProducts.length === 0) return null;

    return (
      <Card>
        <BlockStack gap="400">
          <Text as="h2" variant="headingMd">Products Missing Alcohol Unit Data</Text>
          {results.missingDataProducts.map((product: any) => {
            const isExpanded = expandedProducts.has(product.productId);
            return (
              <div key={product.productId} style={{ borderBottom: '1px solid #e1e3e5', paddingBottom: '1rem' }}>
                <InlineStack gap="400" align="space-between" blockAlign="center">
                  <div style={{ flex: 1 }}>
                    <Text as="p" variant="bodyMd" fontWeight="semibold">{product.productTitle}</Text>
                    <Text as="p" variant="bodySm" tone="subdued">
                      {product.productType || 'No type'} • {product.variants.length} variant(s)
                    </Text>
                  </div>
                  {getStatusBadge(product.status)}
                  <Button onClick={() => toggleProduct(product.productId)} disclosure={isExpanded ? 'up' : 'down'}>
                    {isExpanded ? 'Hide' : 'Show'} Variants
                  </Button>
                </InlineStack>
                <Collapsible open={isExpanded} id={`product-${product.productId}`}>
                  <div style={{ marginTop: '1rem', paddingLeft: '1rem' }}>
                    {product.variants.map(renderVariantRow)}
                  </div>
                </Collapsible>
              </div>
            );
          })}
        </BlockStack>
      </Card>
    );
  };

  const renderPartialDataTable = () => {
    if (!results || results.partialDataProducts.length === 0) return null;

    const rows = results.partialDataProducts.map((product: any) => [
      product.productTitle,
      product.productType || '-',
      product.variants.length,
      getStatusBadge(product.status),
      product.issues.join(', '),
    ]);

    return (
      <Card>
        <BlockStack gap="400">
          <Text as="h2" variant="headingMd">Products With Partial Data</Text>
          <DataTable
            columnContentTypes={['text', 'text', 'numeric', 'text', 'text']}
            headings={['Product', 'Type', 'Variants', 'Status', 'Issues']}
            rows={rows}
          />
        </BlockStack>
      </Card>
    );
  };

  return (
    <Page
      title="MUP Health Check"
      subtitle="Scan products for missing alcohol unit data required for MUP compliance"
      primaryAction={{
        content: "Run Health Check",
        loading: loading,
        onAction: runHealthCheck,
      }}
    >
      <BlockStack gap="400">
        {error && (
          <Banner tone="critical">
            <Text as="p">Error: {error}</Text>
          </Banner>
        )}

        {loading && (
          <Card>
            <div style={{ display: "flex", justifyContent: "center", padding: "2rem" }}>
              <Spinner accessibilityLabel="Running health check" size="large" />
            </div>
          </Card>
        )}

        {!loading && !results && (
          <Card>
            <EmptyState
              heading="Run a health check to scan your products"
              image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
            >
              <p>Click "Run Health Check" to scan your products for missing alcohol unit data required for MUP compliance.</p>
            </EmptyState>
          </Card>
        )}

        {results && (
          <>
            {renderSummary()}
            {results.productsMissingData > 0 && (
              <Banner tone="warning">
                <Text as="p">
                  {results.productsMissingData} product(s) are missing alcohol unit data. These products will not be subject to MUP enforcement until data is added.
                </Text>
              </Banner>
            )}
            {renderMissingDataTable()}
            {renderPartialDataTable()}
          </>
        )}
      </BlockStack>
    </Page>
  );
}

