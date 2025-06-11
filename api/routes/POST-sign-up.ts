import { RouteContext } from "gadget-server";

/**
 * Route handler for sign up
 *
 * @param { RouteContext } route context - see: https://docs.gadget.dev/guides/http-routes/route-configuration#route-context
 *
 */
export default async function route({ request, reply, api, logger, connections }: RouteContext) {
  logger.info({ request}, "request")
  const body = JSON.parse(request.body)
  logger.info({body}, body)
  const email = body.params.email;
  console.log("email", email)
  const name = body.params.name;
  

  console.log("name", name)

  const url = body.params.url
  console.log("url", url)

  const timeStamp= new Date/1000 | 0
  console.log('timestamp', timeStamp)
  
  const consent = {
    "customer_ids": {
      "email_id": email
    },
    "event_type": "consent",
    "timestamp": new Date/1000 | 0,
    "properties": {
      "action": "accept",
      "category": "Ecommerce",
      "valid_until": "unlimited",
      "message": `This consent came from signing up on the ${url.includes("checkout") ? "checkout" : "footer"}`,
      "name": name,
      "url": url
    }
  };

  try {
    const response = await fetch("https://api.exponea.com/track/v2/projects/ea3bff42-5ee3-11ef-b39d-16571f73b836/customers/events", {
      method: "POST",
      headers: {
        "Authorization": "Token 8007zb54ijla2pyqls8a4ptrudqe6uz50i0svyy4am7aq33fhitep6xbyiejrg0h",
        "Accept": "application/json",
        "Content-Type": "application/json"
      },
      body: JSON.stringify(consent)
    });

    const data = await response.json(); // Assuming the API returns JSON
    logger.info({ data }, "data")
    return reply.send(data);
  } catch (error) {
    logger.error("Error sending consent data to Exponea:", error);
    return reply.code(500).send({ error: "Internal Server Error" });
  }
}
