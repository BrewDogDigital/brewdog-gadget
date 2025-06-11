import { Page, Text, Checkbox, Spinner } from "@shopify/polaris";
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";
import { useAction, useFindFirst } from "@gadgetinc/react";

export default function DoubleDiscountPage() {
  const navigate = useNavigate();
 
  const [{ data: shopData, fetching: shopFetching, error: shopError }] = useFindFirst(api.shopifyShop, {
    select: {
      id: true,
      name: true,
      doubleDiscount: true,
    },
  });
  
  // [TODO] Figure out why TS is crying: Gadget discord support
  const [{ error: actionError, fetching: actionFetching }, setDoubleDiscountMetafield] = useAction(api.shopifyShop.setDoubleDiscountMetafield);
  
  const [isChecked, setIsChecked] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const initialSet = useRef(false);

  // Set initial state based on shopData only once
  useEffect(() => {
    if (shopData && !initialSet.current) {
      setIsChecked(shopData.doubleDiscount || false); // Set the checkbox based on doubleDiscount attribute
      initialSet.current = true; // Mark initial set as done
    }
  }, [shopData]);

  const handleCheckboxChange = async () => {
    const newValue = !isChecked;
    const previousState = isChecked;
    setIsChecked(newValue);
    setIsLoading(true);

    if (shopData?.id) {
      try {
        await setDoubleDiscountMetafield({
          doubleDiscount: newValue,
          id: shopData.id,
        });
        // Assuming the backend updated successfully, leave the UI state as is
      } catch (error) {
        console.error("Error setting double discount:", error);
        setIsChecked(previousState);
      } finally {
        setIsLoading(false);
      }
    } else {
      console.warn("Shop data is not available yet.");
      setIsLoading(false);
    }
  };

  return (
    <Page
      title="EFP Double Discount"
      backAction={{
        content: "Shop Information",
        onAction: () => navigate("/"),
      }}
    >
      <Text variant="bodyMd" as="p">
        Check the below checkbox to enable double discounts for EFP members.
      </Text>
      
      {shopData ? (
        <Checkbox
          label="Enable Double Discount"
          checked={isChecked}
          onChange={handleCheckboxChange}
          disabled={actionFetching || isLoading}
        />
      ) : (
        <Spinner accessibilityLabel="Loading shop data" />
      )}

      {shopData && (
        <Text variant="bodyMd" as="p">
          Shop: {shopData.name}
        </Text>
      )}

      {shopError && <Text variant="bodyMd" as="p">Error fetching shop data: {shopError.message}</Text>}
      {actionError && <Text variant="bodyMd" as="p">Error setting double discount: {actionError.message}</Text>}
    </Page>
  );
}
