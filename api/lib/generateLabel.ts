import { Logger } from "gadget-server";

const generateLabel = async (uuid: string, orderId: number, sku: string, logger: Logger ) => {
    try {
  
      const labelBody = {
        "order_id": String(orderId),
        "items": [
          {
            "uuid": uuid,
            "sku": sku
          }
        ] 
      }

      const labelBodyStringified = JSON.stringify(labelBody)

      logger.info({ labelBody }, "Label Body")

      logger.info({ labelBodyStringified }, "Label Body Stringified")
  
      const response = await fetch("https://fs6untjtka.execute-api.eu-west-2.amazonaws.com/v2/asset", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "api-key": "tB6bjEw-sQwdEJAfNBmj-nXU_iZuVrEDDz8iB!URM",
        },
        body: labelBodyStringified,
      });
  
      if (!response.ok) {
        throw new Error(`Failed to generate label. Status: ${response.status}`);
      }
  
      const data = await response.json();
      logger.info("Label generated successfully:", data);
      const url = ` https://fs6untjtka.execute-api.eu-west-2.amazonaws.com/v2/asset?orderId=${orderId}&uuid=${uuid}`
      logger.info({ url }, "URL")
      return data;

    } catch (error) {
      logger.info(`Error generating label for UUID: ${uuid}`, error);
    }
  };

export default generateLabel