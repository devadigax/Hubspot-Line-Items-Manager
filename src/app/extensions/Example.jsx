import React, { useState, useEffect } from "react";
import {
  Table,
  TableHead,
  TableRow,
  Dropdown,
  TableHeader,
  TableBody,
  TableCell,
  NumberInput,
  Input,
  Button,
  hubspot,
  Alert,
  Flex,
  Divider,
  LoadingSpinner,
  Text,
  DateInput,
  TextArea,
} from "@hubspot/ui-extensions";

import {
  NameOptions,
  VariantOptions,
  SizeOptions,
} from "./options";

hubspot.extend(({ context, runServerlessFunction, actions }) => (
  <Extension
    context={context}
    runServerless={runServerlessFunction}
    sendAlert={actions.addAlert}
  />
));

const flattenObject = (obj, parent = "", res = {}) => {
  for (let key in obj) {
    let propName = parent ? `${parent}.${key}` : key;
    if (typeof obj[key] === "object" && obj[key] !== null) {
      flattenObject(obj[key], propName, res);
    } else {
      res[propName] = obj[key];
    }
  }
  return res;
};

const Extension = ({ context, runServerless, sendAlert }) => {
  const [deal, setDeal] = useState(null);
  const [error, setError] = useState(null);
  const [superAdmin, setSuperAdmin] = useState(null);
  const [markedForDeletion, setMarkedForDeletion] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const DEFAULT_PRODEGE_ID = "11";
  const [isActionDisabled, setIsActionDisabled] = useState(false);

  const flattenedContext = flattenObject(context);
  const teamName = flattenedContext["user.teams.0.name"];
  // const teamName = 'Perf';
  const dealId = context.crm.objectId;

  const fetchAndConsoleDeal = async () => {
    setError(null);
    setIsLoading(true);
    try {
      const dealData = await runServerless({
        name: "fetchDealData",
        parameters: { dealId },
      });
      console.log("Fetched deal object:", dealData);
      setDeal(dealData);
    } catch (error) {
      setError(error.message);
      console.error("Error fetching deal object:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch the deal object when the component mounts
  useEffect(() => {
    fetchAndConsoleDeal();
  }, [dealId]);

  const fetchUserData = async () => {
    try {
      const usersId = flattenedContext["user.id"];
      // console.log("--> userId", usersId);
      const response = await runServerless({
        name: "fetchUserData",
        parameters: { userId: usersId },
      });

      // console.log("Fetched user data:", response);
      const flatUserData = flattenObject(response);
      // console.log("Fetched user data:", flatUserData);
      setSuperAdmin(flatUserData["response.results.0.name"]);
      // console.log("superAdmin = ", superAdmin);
      // Handle user data as needed
    } catch (error) {
      console.error("Error fetching user data:", error);
      setError(error.message || "Failed to fetch user data");
    }
  };

  fetchUserData();


  const [lineItems, setLineItems] = useState([
    { start_date: null, end_date: null, invoice_date: null },
    { start_date: null, end_date: null, invoice_date: null },
  ]);



  useEffect(() => {
    const fetchLineItem = async () => {
      try {
        setLineItems(await fetchLineItems());
      } catch (error) {
        console.error("Failed to fetch Line Items:", error);
        setError("Failed to fetch Line Items.");
      }
    };
    fetchLineItem();
  }, [context.crm.objectId, runServerless]);

  const ActionOptions = [
    { label: "Delete", id: "delete", value: "Delete" },
    { label: "Clone", id: "clone", value: "Clone" },
  ];

  function createEmptyLineItem() {
    return {
      prod_size: DEFAULT_PRODEGE_ID,
      name: "",
      description: "",
      price: "",
      quantity: 1,
      netPrice: "",
      vertical: ""
    };
  }

  const fetchLineItems = async () => {
    const response = await runServerless({
      name: "fetchLineItem",
      parameters: { dealId: context.crm.objectId },
    });
    if (response && Array.isArray(response.response)) {
      console.log("response.response ---> ", response.response)
      return await response.response;
    } else {
      console.error("Unexpected response format:", response);
      return [];
    }
  };

  const isRowComplete = (item) => {
    return (
      item.prod_size ||
      item.name ||
      item.description ||
      item.price ||
      item.quantity ||
      item.vertical
    );
  };

  const handleTableInputChange = (value, index, key) => {
    const updatedItems = [...lineItems];

    if (key === "price") {
      updatedItems[index][key] = `${parseFloat(value).toFixed(2)}`;
    } else if (
      key === "prod_size"
    ) {
      updatedItems[index][key] = value;
    } else {
      updatedItems[index][key] = value;
    }

    setLineItems(updatedItems);
    console.log("line items hamza", lineItems);
    setIsDirty(true);
  };

  const handleActionSelect = async (action, index) => {
    setIsActionDisabled(true);
    if (action === "delete") {
      console.log("DropDown Delete Clicked Successfully");
      await handleDeleteLineItem(index);
      await recalculateTotalNetPrice();
    } else if (action === "clone") {
      const lineItemToClone = lineItems[index];
      const clonedLineItem = { ...lineItemToClone };

      delete clonedLineItem.id;

      setLineItems([clonedLineItem, ...lineItems]);
      sendAlert({ message: "Line Item cloned successfully", type: "success" });
      setIsDirty(true);
      await recalculateTotalNetPrice();
    }

    setTimeout(() => {
      setIsActionDisabled(false);
    }, 1000);
  };

  const handleDeleteLineItem = async (index) => {
    console.log("handleDeleteLineItem called successfully");
    const lineItem = lineItems[index];
    // Mark the item for deletion
    setMarkedForDeletion([...markedForDeletion, lineItem]);
    // Temporarily remove the item from the displayed list
    setLineItems(lineItems.filter((_, i) => i !== index));
    sendAlert({ message: `Line Item marked for deletion`, type: "warning" });
    setIsDirty(true);
  };

  const handleCancelEvent = async () => {
    setError(null);
    setIsLoading(true);
    setLineItems(await fetchLineItems());
    setIsLoading(false);
  };

  const handleSubmitAll = async () => {
    // setLineItems(await fetchLineItems());
    setError(null);
    setIsLoading(true);
    const dealId = context.crm.objectId;

    const createdItems = [];
    const updatedItems = [];
    let validationError = false;

    const validatedLineItems = lineItems.map((item) => {
      const newItem = { ...item, isValid: true, validationMessage: "" };

      if (!item.name) {
        newItem.isValid = false;
        validationError = true;
      }
      if (!item.description) {
        newItem.isValid = false;
        validationError = true;
      }
      if (!item.price) {
        newItem.isValid = false;
        validationError = true;
      }
      if (!item.quantity) {
        newItem.isValid = false;
        validationError = true;
      }

      return newItem;
    });

    setLineItems(validatedLineItems);

    if (validationError) {
      setError("Please fill out all required fields.");
      sendAlert({
        message: "Please fill out all required fields.",
        type: "danger",
      });
      setIsLoading(false);
      return;
    }

    try {
      await recalculateTotalNetPrice();

      const promises = lineItems.map((item) => {

        let hs_sku_val;
        if (item.name) {
          hs_sku_val = `${item.name}-${item.vertical}-${item.prod_size}`;
        }

        const params = {
          lineItemId: item.id,
          dealId: dealId,
          prod_size: item.prod_size,
          name: item.name,
          description: item.description,
          price: item.price,
          quantity: parseInt(item.quantity, 10),
          hs_sku: hs_sku_val,
          vertical: item.vertical,
        };

        console.log("params --> ", params);

        if (item.id) {
          updatedItems.push(item.name);
          return runServerless({
            name: "createLineItem",
            parameters: params,
          });
        } else {
          createdItems.push(item.name);
          return runServerless({
            name: "createLineItem",
            parameters: params,
          });
        }
      });

      // Add delete requests for marked items
      markedForDeletion.forEach((item) => {
        console.log("Delete surverless function called", item.id);
        promises.push(
          runServerless({
            name: "deleteLineItem",
            parameters: { lineItemId: item.id },
          })
        );
      });

      console.log("All Line Items with IDs:");
      lineItems.forEach((item) => {
        console.log(`ID: ${item.id}, Name: ${item.name}`);
      });

      const responses = await Promise.all(promises);

      const hasError = responses.some((response) => response.error);
      if (hasError) {
        throw new Error(
          "An error occurred while creating/updating some Line Items."
        );
      }

      if (createdItems.length > 0) {
        sendAlert({
          message: `Line items created successfully`,
          type: "success",
        });
      } else if (updatedItems.length > 0) {
        sendAlert({
          message: `Line items updated successfully`,
          type: "success",
        });
      }
      setIsDirty(false);
      setMarkedForDeletion([]);
      setLineItems(await fetchLineItems());
    } catch (error) {
      setError(error.message);
      sendAlert({ message: error.message, type: "danger" });
    } finally {
      setTimeout(async () => {
        setLineItems(await fetchLineItems());
        setIsLoading(false);
      }, 100);
      setIsLoading(false);
    }
  };

  const getSizeValue = (id) => {
    id = id || DEFAULT_PRODEGE_ID;
    const option = SizeOptions.find((opt) => opt.id === id);
    return option ? option.label : "";
  };

  const getNameValue = (id) => {
    const option = NameOptions.find((opt) => opt.id === id);
    return option ? option.label : "";
  };

  const getVerticalValue = (id) => {
    const option = VariantOptions.find((opt) => opt.id === id);
    return option ? option.label : "";
  };

  const handleAddLineItem = async () => {
    if (lineItems.every(isRowComplete)) {
      // setLineItems([...lineItems, createEmptyLineItem()]);
      setLineItems([createEmptyLineItem(), ...lineItems]);
      setIsDirty(true);
      setError(null);

      await recalculateTotalNetPrice();
    } else {
      setError(
        "Please complete all fields in the current rows before adding a new Line Item."
      );
    }
  };

  const recalculateTotalNetPrice = async () => {
    const dealId = context.crm.objectId;

    // Calculate total net price
    let totalNetPrice = 0;
    lineItems.forEach((item) => {
      if (!item.markedForDeletion) {
        const netPrice = item.quantity * item.price;
        totalNetPrice += netPrice;
      }
    });

    // Update the deal with the total amount
    try {
      const updatedDeal = await runServerless({
        name: "fetchDealData",
        parameters: {
          dealId,
          amount: totalNetPrice,
        },
      });
      console.log("Updated deal object:", updatedDeal);
      setDeal(updatedDeal);
    } catch (error) {
      console.error("Failed to update deal:", error);
      setError("Failed to update the deal amount.");
    }
  };

  return (
    <>
      <Flex direction={"row"} justify={"between"}>
        <Text></Text>
        <Button variant="primary" onClick={handleAddLineItem} align={"end"}>
          Add New Line Item
        </Button>
      </Flex>
      <Divider />
      <Table bordered={true}>
        <TableHead>
          <TableRow>
            <TableHeader width="min">Product</TableHeader>
            <TableHeader width="min">Variant</TableHeader>
            <TableHeader width="min">Size</TableHeader>
            <TableHeader width="min">Details</TableHeader>
            <TableHeader width="min">Unit Price</TableHeader>
            <TableHeader width="min">Quantity</TableHeader>
            <TableHeader width="min">Amount</TableHeader>
            <TableHeader width="min">Action</TableHeader>
          </TableRow>
        </TableHead>
        <TableBody>
          {lineItems.map((lineItem, index) => {
            return (
              <TableRow key={index}>

                <TableCell>
                  <Dropdown
                    options={NameOptions.map((option) => ({
                      label: option.label,
                      onClick: () =>
                        handleTableInputChange(option.id, index, "name"),
                    }))}
                    variant="secondary"
                    buttonSize="md"
                    buttonText={getNameValue(lineItem.name) || " "}
                    required={true}
                    error={!lineItem.isValid && !lineItem.name}
                    validationMessage={
                      !lineItem.name ? "Name is missing" : ""
                    }
                  />
                </TableCell>

                <TableCell>
                  <Dropdown
                    options={VariantOptions.map((option) => ({
                      label: option.label,
                      onClick: () =>
                        handleTableInputChange(option.id, index, "vertical"),
                    }))}
                    variant="secondary"
                    buttonSize="md"
                    buttonText={getVerticalValue(lineItem.vertical) || " "}
                    required
                  />
                </TableCell>

                <TableCell>
                  <Dropdown
                    options={SizeOptions.map((option) => ({
                      label: option.label,
                      onClick: () =>
                        handleTableInputChange(
                          option.id,
                          index,
                          "prod_size"
                        ),
                    }))}
                    variant="secondary"
                    buttonSize="md"
                    buttonText={getSizeValue(lineItem.prod_size)}
                    required={true}
                    error={!lineItem.isValid && !lineItem.prod_size}
                    validationMessage={
                      !lineItem.prod_size
                        ? "Prodege Property is missing"
                        : ""
                    }
                  // disabled={true}
                  />
                </TableCell>

                <TableCell>
                  <TextArea
                    value={lineItem.description || ""}
                    onChange={(newValue) =>
                      handleTableInputChange(newValue, index, "description")
                    }
                    error={!lineItem.isValid && !lineItem.description}
                    validationMessage={lineItem.validationMessage}
                    onInput={(value) => {
                      if (value === "") {
                        setLineItems((prevItems) => {
                          const updatedItems = [...prevItems];
                          updatedItems[index].isValid = false;
                          updatedItems[index].validationMessage =
                            "Description is missing";
                          return updatedItems;
                        });
                      } else {
                        setLineItems((prevItems) => {
                          const updatedItems = [...prevItems];
                          updatedItems[index].isValid = true;
                          updatedItems[index].validationMessage = "";
                          return updatedItems;
                        });
                      }
                    }}
                  />
                </TableCell>

                <TableCell>
                  <NumberInput
                    value={lineItem.price || ""}
                    onChange={(newValue) =>
                      handleTableInputChange(newValue, index, "price")
                    }
                    required={true}
                    error={!lineItem.isValid && !lineItem.price}
                    validationMessage={
                      !lineItem.price ? "Price is missing" : ""
                    }
                  />
                </TableCell>

                <TableCell>
                  <NumberInput
                    value={lineItem.quantity || ""}
                    onChange={(newValue) =>
                      handleTableInputChange(newValue, index, "quantity")
                    }
                    required={true}
                    error={!lineItem.isValid && !lineItem.quantity}
                    validationMessage={
                      !lineItem.quantity ? "Quantity is missing" : ""
                    }
                  />
                </TableCell>


                <TableCell>$ {lineItem.quantity * lineItem.price}</TableCell>



                <TableCell>
                  {isActionDisabled ? (
                    <LoadingSpinner label="Loading..." />
                  ) : (
                    <Dropdown
                      options={ActionOptions.map((option) => ({
                        label: option.label,
                        onClick: () => handleActionSelect(option.id, index),
                      }))}
                      disabled={isActionDisabled}
                      variant="secondary"
                      buttonSize="md"
                      buttonText="Action"
                    />
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      <Flex direction={"row"} gap={"medium"}>
        <Button
          variant="primary"
          onClick={handleSubmitAll}
          disabled={!isDirty || isLoading}
        >
          Save
        </Button>
        <Button
          variant="danger"
          onClick={handleCancelEvent}
          disabled={isLoading}
        >
          Cancel
        </Button>
        {isLoading && <LoadingSpinner label="Loading..." />}
      </Flex>
      {error && (
        <Alert type="danger" title="Error" onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
    </>
  );
};

export default Extension;
