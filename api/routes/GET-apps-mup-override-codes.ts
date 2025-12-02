import type { RouteContext } from "gadget-server";
import { api } from "gadget-server";

/**
 * API endpoint to expose MUP override discount codes to the frontend
 * Endpoint: /apps/mup/override-codes.json
 */
export default async function route({ request, reply }: RouteContext) {
  // Set CORS headers to allow requests from Shopify storefronts
  reply.header('Access-Control-Allow-Origin', '*');
  reply.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
  reply.header('Access-Control-Allow-Headers', 'Content-Type, Accept');
  // Prevent caching to ensure fresh data
  reply.header('Cache-Control', 'no-cache, no-store, must-revalidate');
  reply.header('Pragma', 'no-cache');
  reply.header('Expires', '0');

  // Handle preflight OPTIONS request
  if (request.method === 'OPTIONS') {
    return reply.code(200).send();
  }

  try {
    // Fetch the shop's override codes from metafields
    const result = await (api as any).getMupSettings({});

    if (!result.success || !result.settings) {
      console.log("[Override Codes Endpoint] Failed to get settings:", result);
      return reply.code(200).send({
        success: false,
        codes: []
      });
    }

    // Parse the override codes (comma or newline separated)
    const overrideCodesString = result.settings.overrideCodes || "";
    const codes = overrideCodesString
      .split(/[,\n]+/)
      .map((code: string) => code.trim().toUpperCase())
      .filter((code: string) => code.length > 0);

    console.log("[Override Codes Endpoint] Returning codes:", codes);
    return reply.code(200).send({
      success: true,
      codes: codes
    });

  } catch (error) {
    console.error("[Override Codes Endpoint] Error:", error);
    return reply.code(500).send({
      success: false,
      error: "Failed to fetch override codes",
      codes: []
    });
  }
}

