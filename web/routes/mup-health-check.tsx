import { useState, useCallback } from "react";
import { Page, Card, Button, DataTable, Badge, Banner, Text, InlineStack, BlockStack, Spinner, EmptyState } from "@shopify/polaris";
import { api } from "../api";
import React from "react";

export default function MupHealthCheckPage() {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const runHealthCheck = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.mupHealthCheck({ limit: 100 });
      setResults(response.results);
    } catch (e: any) {
      setError(e.message || String(e));
    } finally {
      setLoading(false);
    }
  }, []);

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

  const renderMissingDataTable = () => {
    if (!results || results.missingDataProducts.length === 0) return null;

    const rows = results.missingDataProducts.map((product: any) => [
      product.productTitle,
      product.productType || '-',
      product.variants.length,
      getStatusBadge(product.status),
      product.recommendations.join(', '),
    ]);

    return (
      <Card>
        <BlockStack gap="400">
          <Text as="h2" variant="headingMd">Products Missing Alcohol Unit Data</Text>
          <DataTable
            columnContentTypes={['text', 'text', 'numeric', 'text', 'text']}
            headings={['Product', 'Type', 'Variants', 'Status', 'Recommendations']}
            rows={rows}
          />
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

