import type { RouteContext } from "gadget-server";
import { api } from "gadget-server";

/**
 * API endpoint to expose MUP override discount codes to the frontend
 * Endpoint: /apps/mup/override-codes.json
 */
export default async function route({ request, reply }: RouteContext) {
  try {
    // Fetch the shop's override codes from metafields
    const result = await (api as any).getMupSettings({});
    
    if (!result.success || !result.settings) {
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

