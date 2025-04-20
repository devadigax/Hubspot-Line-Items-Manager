const axios = require("axios");
const HUBSPOT_API_KEY = process.env.PRIVATE_APP_ACCESS_TOKEN; // Secure key handling

exports.main = async (context = {}) => {
  const { lineItemId } = context.parameters;

  if (!lineItemId) {
    return { statusCode: 400, body: { message: 'Line item ID is required.' } };
  }

  try {
    // First, fetch the details of the line item to be cloned
    console.log(`Fetching line item details for ID: ${lineItemId}`);
    const fetchResponse = await axios.get(
      `https://api.hubapi.com/crm/v3/objects/line_items/${lineItemId}`,
      {
        headers: {
          'Authorization': `Bearer ${HUBSPOT_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const lineItemDetails = fetchResponse.data.properties;
    delete lineItemDetails.id; // Remove the id property for cloning

    // Now create a new line item with the fetched details
    console.log('Cloning the line item...');
    const createResponse = await axios.post(
      `https://api.hubapi.com/crm/v3/objects/line_items`,
      {
        properties: lineItemDetails,
      },
      {
        headers: {
          'Authorization': `Bearer ${HUBSPOT_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const newLineItemId = createResponse.data.id;

    console.log(`Line item cloned successfully with ID: ${newLineItemId}`);
    return { success: true, lineItemId: newLineItemId };
  } catch (error) {
    console.error('Error cloning line item:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
      return {
        statusCode: error.response.status,
        body: { message: error.response.data.message || error.message }
      };
    } else {
      return {
        statusCode: 500,
        body: { message: error.message }
      };
    }
  }
};
