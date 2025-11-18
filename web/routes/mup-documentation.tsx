import { useState, useMemo } from "react";
import {
  Page,
  Card,
  Text,
  BlockStack,
  InlineStack,
  TextField,
  Banner,
  Divider,
  List,
  Link,
  Badge,
  Box,
  Collapsible,
  Button,
} from "@shopify/polaris";
import { SearchIcon } from "@shopify/polaris-icons";
import React from "react";

interface DocumentationSection {
  id: string;
  title: string;
  content: React.ReactNode;
  tags: string[];
}

export default function MupDocumentationPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(["overview", "deployment", "configuration"])
  );

  const toggleSection = (sectionId: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(sectionId)) {
      newExpanded.delete(sectionId);
    } else {
      newExpanded.add(sectionId);
    }
    setExpandedSections(newExpanded);
  };

  const sections: DocumentationSection[] = [
    {
      id: "overview",
      title: "Overview",
      tags: ["introduction", "what is mup", "purpose"],
      content: (
        <BlockStack gap="400">
          <Text variant="bodyMd" as="p">
            The Minimum Unit Pricing (MUP) Compliance App enforces Scotland's Minimum Unit Pricing law for alcohol sales. 
            The app ensures that any cart destined for Scotland is never below £0.65 per alcohol unit after all price effects, 
            or else checkout is blocked.
          </Text>
          <Text variant="bodyMd" as="p">
            <strong>Key Features:</strong>
          </Text>
          <List>
            <List.Item>Automatic levy calculation and application for products below MUP</List.Item>
            <List.Item>Checkout validation that blocks orders violating MUP requirements</List.Item>
            <List.Item>Region detection via postcode, GeoIP, or manual selection</List.Item>
            <List.Item>Override discount codes for approved exemptions</List.Item>
            <List.Item>Checkout UI guidance and repair actions</List.Item>
          </List>
        </BlockStack>
      ),
    },
    {
      id: "deployment",
      title: "Installation   Guide",
      tags: ["setup", "install", "deploy", "installation", "shopify cli", "build", "deploy", "extensions", "functions"],
      content: (
        <BlockStack gap="400">
          <Text variant="headingMd" as="h3">Prerequisites</Text>
          <Text variant="bodyMd" as="p">
            Before deploying to your Shopify store, ensure you have:
          </Text>
          <List>
            <List.Item>Shopify Plus account (required for Cart Transform and Checkout UI Extensions)</List.Item>
            <List.Item>Access to your Shopify Admin</List.Item>
            <List.Item>App installed and connected to your store</List.Item>
          </List>

          <Text variant="headingMd" as="h3">Step 1: Install the App</Text>
          <List type="number">
            <List.Item>Install the app from the Shopify App Store or via custom installation</List.Item>
            <List.Item>Grant all required permissions when prompted</List.Item>
            <List.Item>Navigate to the app in your Shopify Admin</List.Item>
          </List>

          <Text variant="headingMd" as="h3">Step 2: Setup Metafields</Text>
          <List type="number">
            <List.Item>In MUP Settings, click <strong>"Setup Metafields"</strong> to create required metafield definitions</List.Item>
            <List.Item>This creates shop-level and product-level metafield definitions automatically</List.Item>
          </List>

          <Text variant="headingMd" as="h3">Step 3: Configure Settings</Text>
          <List type="number">
            <List.Item>Go to <strong>MUP Settings</strong> in the app navigation</List.Item>
            <List.Item>Click <strong>"Create Levy Product"</strong> to generate the hidden levy variant (or enter an existing variant ID)</List.Item>
            <List.Item>Verify the Minimum Unit Price is set to <strong>£0.65</strong> (default)</List.Item>
            <List.Item>Enable MUP enforcement by toggling <strong>"Enforcement Enabled"</strong></List.Item>
            <List.Item>Click <strong>"Save Settings"</strong></List.Item>
          </List>

          
          <Text variant="headingMd" as="h3">Step 4: Configure Product Data</Text>
          <List type="number">
            <List.Item>For each alcoholic product, add the <strong>total_units</strong> metafield (namespace: <code>custom</code>, key: <code>total_units</code>)</List.Item>
            <List.Item>Use the <strong>MUP Health Check</strong> page to identify products missing unit data</List.Item>
          </List>

          <Text variant="headingMd" as="h3">Step 6: Add Theme Extensions</Text>
          <List type="number">
            <List.Item>In Shopify Admin → Online Store → Themes → Customize</List.Item>
            <List.Item>Add the <strong>UK Region Selector</strong> block to your theme</List.Item>
            <List.Item>Add <strong>Product Advisory</strong> blocks to product pages</List.Item>
            <List.Item>Add <strong>Cart Advisory</strong> blocks to cart pages</List.Item>
            <List.Item>Add <strong>Cart Discount Input</strong> block to cart page (optional, for override codes)</List.Item>
          </List>

          <Box paddingBlockStart="400">
            <Banner tone="info">
              <Text as="p">
                <strong>Development vs Production:</strong> Use <code>shopify app dev</code> for local development with hot reloading. 
                Use <code>shopify app deploy</code> for production deployments.
              </Text>
            </Banner>
          </Box>
        </BlockStack>
      ),
    },
    {
      id: "configuration",
      title: "Configuration",
      tags: ["settings", "override codes", "geoip", "metafields"],
      content: (
        <BlockStack gap="400">
          <Text variant="headingMd" as="h3">MUP Settings</Text>
          <Text variant="bodyMd" as="p">
            Access configuration via <strong>MUP Settings</strong> in the app navigation.
          </Text>

          <Text variant="headingMd" as="h3">Levy Variant ID</Text>
          <Text variant="bodyMd" as="p">
            The hidden product variant used for MUP levy line items. Use the <strong>"Create Levy Product"</strong> button 
            to automatically generate this, or enter an existing variant ID in the format: <code>gid://shopify/ProductVariant/123456789</code>
          </Text>

          <Text variant="headingMd" as="h3">Minimum Unit Price</Text>
          <Text variant="bodyMd" as="p">
            Default: £0.65 (Scotland's legal minimum). Only change if legislation updates.
          </Text>

          <Text variant="headingMd" as="h3">Enforcement Enabled</Text>
          <Text variant="bodyMd" as="p">
            Toggle to enable/disable MUP enforcement. When disabled, no levies are added and validation is bypassed.
          </Text>

          <Text variant="headingMd" as="h3">Override Discount Codes</Text>
          <Text variant="bodyMd" as="p">
            Add discount codes that bypass MUP enforcement (e.g., staff discounts, customer service codes). 
            These codes must be applied at the cart level (not checkout) to work.
          </Text>
          <Banner tone="info">
            <Text as="p">
              <strong>Active Override Codes:</strong> DRAGONREJECT, LINKEDINFLUENCER, THERAPYDOG, WATTSGOINGON
            </Text>
          </Banner>

          <Text variant="headingMd" as="h3">GeoIP Settings (Optional)</Text>
          <Text variant="bodyMd" as="p">
            Enable automatic region detection using MaxMind GeoIP. Requires:
          </Text>
          <List>
            <List.Item>MaxMind account ID and license key</List.Item>
            <List.Item>Domain allow-listing in MaxMind dashboard</List.Item>
            <List.Item>Note: Client-side GeoIP may be blocked by ad-blockers</List.Item>
          </List>
        </BlockStack>
      ),
    },
    {
      id: "limitations",
      title: "Known Limitations & Constraints",
      tags: ["limitations", "constraints", "cannot do", "restrictions", "automatic discounts"],
      content: (
        <BlockStack gap="400">
          <Banner tone="critical">
            <Text as="p" fontWeight="bold">
              Critical: Automatic Discounts Cannot Be Used with MUP Enforcement
            </Text>
            <Text as="p">
              When automatic discounts (Shopify's native automatic discounts) are applied to a product, 
              Shopify automatically discounts child line items (including MUP levies) proportionally. 
              This cannot be prevented and will violate MUP compliance.
            </Text>
            <Text as="p">
              <strong>Solution:</strong> Block products in Scotland when automatic discounts are active, 
              or use manual discount codes that can be validated.
            </Text>
          </Banner>

          <Text variant="headingMd" as="h3">Discount Limitations</Text>
          <List>
            <List.Item>
              <strong>Automatic Discounts:</strong> Will discount levy lines and break MUP compliance. 
              Products must be blocked in Scotland when auto discounts are active.
            </List.Item>
            <List.Item>
              <strong>Product-Level Discounts:</strong> Same issue - discounting parent line discounts child levy lines.
            </List.Item>
            <List.Item>
              <strong>Manual Discount Codes:</strong> Will be blocked by validation if they reduce price below MUP floor. 
              This is expected behavior.
            </List.Item>
            <List.Item>
              <strong>Compare at Price:</strong> Does NOT affect MUP - only visual pricing, actual product price is used.
            </List.Item>
          </List>

          <Text variant="headingMd" as="h3">Platform Limitations</Text>
          <List>
            <List.Item>
              <strong>Nested Lines:</strong> Only one level of nesting supported. Cannot nest under bundles.
            </List.Item>
            <List.Item>
              <strong>Execution Order:</strong> Cart Transform runs before discounts, so levy is calculated on original price. 
              Validation runs after discounts to check final compliance.
            </List.Item>
            <List.Item>
              <strong>Express Checkouts:</strong> Billing address may not be available for validation. 
              Enforcement defaults to shipping address.
            </List.Item>
          </List>

        </BlockStack>
      ),
    },
    {
      id: "testing",
      title: "Testing Guide",
      tags: ["testing", "test cases", "qa", "verification"],
      content: (
        <BlockStack gap="400">
          <Text variant="headingMd" as="h3">Basic Functionality Tests</Text>
          
          <Text variant="bodyMd" as="p" fontWeight="bold">Test 1: Scottish Customer - Product Below MUP</Text>
          <List type="number">
            <List.Item>Set region to Scotland (via selector or GeoIP)</List.Item>
            <List.Item>Add product with price below MUP floor to cart</List.Item>
            <List.Item>Proceed to checkout</List.Item>
            <List.Item><strong>Expected:</strong> Levy line item added, total meets MUP</List.Item>
          </List>

          <Text variant="bodyMd" as="p" fontWeight="bold">Test 2: Scottish Customer - Product Above MUP</Text>
          <List type="number">
            <List.Item>Set region to Scotland</List.Item>
            <List.Item>Add product already above MUP floor</List.Item>
            <List.Item>Proceed to checkout</List.Item>
            <List.Item><strong>Expected:</strong> No levy added, checkout proceeds normally</List.Item>
          </List>

          <Text variant="bodyMd" as="p" fontWeight="bold">Test 3: Non-Scottish Customer</Text>
          <List type="number">
            <List.Item>Set region to England/Wales/NI</List.Item>
            <List.Item>Add any product to cart</List.Item>
            <List.Item><strong>Expected:</strong> No MUP enforcement, no levy added</List.Item>
          </List>

          <Text variant="headingMd" as="h3">Discount Testing</Text>

          <Text variant="bodyMd" as="p" fontWeight="bold">Test 4: Manual Discount Code - Below MUP</Text>
          <List type="number">
            <List.Item>Set region to Scotland</List.Item>
            <List.Item>Add product to cart</List.Item>
            <List.Item>Apply discount code that reduces price below MUP</List.Item>
            <List.Item>Proceed to checkout</List.Item>
            <List.Item><strong>Expected:</strong> Checkout blocked with error message, repair UI shown</List.Item>
          </List>

          <Text variant="bodyMd" as="p" fontWeight="bold">Test 5: Override Discount Code</Text>
          <List type="number">
            <List.Item>Set region to Scotland</List.Item>
            <List.Item>Add product to cart</List.Item>
            <List.Item>Apply override code (e.g., DRAGONREJECT) at cart level</List.Item>
            <List.Item>Proceed to checkout</List.Item>
            <List.Item><strong>Expected:</strong> Checkout proceeds, MUP bypassed</List.Item>
          </List>

          <Text variant="headingMd" as="h3">Black Friday Testing</Text>
          <Text variant="bodyMd" as="p">
            For Black Friday campaigns, test the following scenarios:
          </Text>
          <List>
            <List.Item>
              <strong>Compare at Price Discounts:</strong> Verify MUP still calculates correctly 
              (compare at price doesn't affect actual price)
            </List.Item>
            <List.Item>
              <strong>Manual Discount Codes:</strong> Test that codes reducing price below MUP are blocked
            </List.Item>
            <List.Item>
              <strong>Override Codes:</strong> Verify EFP accounts and staff codes work correctly
            </List.Item>
            <List.Item>
              <strong>Automatic Discounts:</strong> Confirm products are blocked in Scotland when auto discounts are active
            </List.Item>
          </List>

          <Banner tone="warning">
            <Text as="p">
              <strong>Important:</strong> Automatic discounts cannot be tested with MUP enforcement active. 
              Products must be blocked in Scotland during automatic discount campaigns.
            </Text>
          </Banner>
        </BlockStack>
      ),
    },
    {
      id: "troubleshooting",
      title: "Troubleshooting",
      tags: ["troubleshooting", "issues", "problems", "fix", "errors"],
      content: (
        <BlockStack gap="400">
          <Text variant="headingMd" as="h3">Levy Not Being Added</Text>
          <List>
            <List.Item>Check that region is set to Scotland (check cart attribute <code>uk_region</code>)</List.Item>
            <List.Item>Verify MUP enforcement is enabled in settings</List.Item>
            <List.Item>Confirm product has <code>total_units</code> metafield set</List.Item>
            <List.Item>Check that Cart Transform function is activated in Shopify Admin</List.Item>
            <List.Item>Verify levy variant ID is correct in settings</List.Item>
          </List>

          <Text variant="headingMd" as="h3">Checkout Always Blocked</Text>
          <List>
            <List.Item>Check if discount code is reducing price below MUP floor</List.Item>
            <List.Item>Verify product units are calculated correctly (ABV% × Volume in litres)</List.Item>
            <List.Item>Check if automatic discount is active (will break MUP compliance)</List.Item>
            <List.Item>Review validation error message for specific issue</List.Item>
          </List>

          <Text variant="headingMd" as="h3">Override Codes Not Working</Text>
          <List>
            <List.Item>Ensure code is added to override list in MUP Settings</List.Item>
            <List.Item>Verify code is applied at cart level (not checkout level)</List.Item>
            <List.Item>Check cart attribute <code>mup_override</code> is set to "true"</List.Item>
            <List.Item>Codes are case-insensitive but must match exactly</List.Item>
          </List>

          <Text variant="headingMd" as="h3">Region Selector Not Showing</Text>
          <List>
            <List.Item>Verify theme extension blocks are added to theme</List.Item>
            <List.Item>Check that country is set to UK (region selector only shows for UK)</List.Item>
            <List.Item>Clear browser cookies and try again</List.Item>
            <List.Item>Check browser console for JavaScript errors</List.Item>
          </List>

          <Text variant="headingMd" as="h3">GeoIP Not Working</Text>
          <List>
            <List.Item>Verify MaxMind account ID and license key are correct</List.Item>
            <List.Item>Check domain is allow-listed in MaxMind dashboard</List.Item>
            <List.Item>Ad-blockers may prevent GeoIP calls - test with blocker disabled</List.Item>
            <List.Item>Check browser console for API errors</List.Item>
          </List>

          <Text variant="headingMd" as="h3">Deployment Issues</Text>
          <List>
            <List.Item>
              <strong>Build fails:</strong> Ensure all dependencies are installed. Run <code>npm install</code> in each extension directory if needed.
            </List.Item>
            <List.Item>
              <strong>Deploy fails with authentication error:</strong> Run <code>shopify auth login</code> to re-authenticate.
            </List.Item>
            <List.Item>
              <strong>Functions not appearing in Shopify Admin:</strong> Wait a few minutes after deployment, then refresh. Functions may take time to sync.
            </List.Item>
            <List.Item>
              <strong>Extensions not showing in theme editor:</strong> Ensure theme extensions are deployed. Check <code>shopify app deploy</code> output for errors.
            </List.Item>
            <List.Item>
              <strong>Checkout UI extension not visible:</strong> Verify you have Shopify Plus. Checkout UI extensions require Plus subscription.
            </List.Item>
            <List.Item>
              <strong>Function activation fails:</strong> Check that the app has the required scopes: <code>read_cart_transforms</code>, <code>write_cart_transforms</code>, <code>read_discounts_allocator_functions</code>, <code>write_discounts_allocator_functions</code>.
            </List.Item>
          </List>
        </BlockStack>
      ),
    }
  ];

  const filteredSections = useMemo(() => {
    if (!searchQuery.trim()) {
      return sections;
    }

    const query = searchQuery.toLowerCase();
    return sections.filter(
      (section) =>
        section.title.toLowerCase().includes(query) ||
        section.tags.some((tag) => tag.includes(query)) ||
        (typeof section.content === "string" &&
          section.content.toLowerCase().includes(query))
    );
  }, [searchQuery]);

  const highlightText = (text: string, query: string) => {
    if (!query.trim()) return text;
    const parts = text.split(new RegExp(`(${query})`, "gi"));
    return (
      <>
        {parts.map((part, i) =>
          part.toLowerCase() === query.toLowerCase() ? (
            <mark key={i}>{part}</mark>
          ) : (
            part
          )
        )}
      </>
    );
  };

  return (
    <Page
      title="MUP Documentation"
      subtitle="Complete guide to Minimum Unit Pricing compliance app"
    >
      <BlockStack gap="500">
        <Card>
          <BlockStack gap="400">
            <TextField
              label="Search Documentation"
              labelHidden
              placeholder="Search by keyword, topic, or issue..."
              value={searchQuery}
              onChange={setSearchQuery}
              prefix={<SearchIcon />}
              clearButton
              onClearButtonClick={() => setSearchQuery("")}
              autoComplete="off"
            />
            {searchQuery && (
              <Text variant="bodySm" tone="subdued" as="p">
                Found {filteredSections.length} section
                {filteredSections.length !== 1 ? "s" : ""} matching "{searchQuery}"
              </Text>
            )}
          </BlockStack>
        </Card>

        {filteredSections.length === 0 ? (
          <Card>
            <BlockStack gap="200">
              <Text variant="headingMd" as="h2">
                No results found
              </Text>
              <Text variant="bodyMd" as="p" tone="subdued">
                Try a different search term or{" "}
                <Button
                  onClick={() => setSearchQuery("")}
                  variant="plain"
                >
                  clear your search
                </Button>
              </Text>
            </BlockStack>
          </Card>
        ) : (
          filteredSections.map((section) => (
            <Card key={section.id}>
              <BlockStack gap="400">
                <InlineStack align="space-between" blockAlign="center">
                  <Text variant="headingLg" as="h2">
                    {section.title}
                  </Text>
                  <Button
                    onClick={() => toggleSection(section.id)}
                    ariaExpanded={expandedSections.has(section.id)}
                    variant="plain"
                  >
                    {expandedSections.has(section.id) ? "Collapse" : "Expand"}
                  </Button>
                </InlineStack>
                <Collapsible
                  open={expandedSections.has(section.id)}
                  id={section.id}
                  transition={{ duration: "200ms", timingFunction: "ease-in-out" }}
                >
                  <Box paddingBlockStart="400">
                    {section.content}
                  </Box>
                </Collapsible>
              </BlockStack>
            </Card>
          ))
        )}

        <Card>
          <BlockStack gap="300">
            <Text variant="headingMd" as="h3">
              Quick Links
            </Text>
            <Divider />
            <InlineStack gap="400">
              <Link url="/mup-settings">MUP Settings</Link>
              <Link url="/mup-health-check">Health Check</Link>
            </InlineStack>
          </BlockStack>
        </Card>
      </BlockStack>
    </Page>
  );
}

