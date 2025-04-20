const axios = require('axios');

const HUBSPOT_API_KEY = process.env.PRIVATE_APP_ACCESS_TOKEN; // Secure key handling

exports.main = async (context = {}) => {
  const { lineItemId } = context.parameters;

  if (!lineItemId) {
    return { statusCode: 400, body: { message: 'Line item ID is required.' } };
  }

  try {
    const url = `https://api.hubapi.com/crm/v3/objects/line_items/${lineItemId}`;
    console.log(`Attempting to delete line item at: ${url}`);

    const response = await axios.delete(url, {
      headers: {
        'Authorization': `Bearer ${HUBSPOT_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    if (response.status === 204) {
      console.log(`Line item with ID ${lineItemId} deleted successfully.`);
      return { statusCode: 200, body: { message: 'Line item deleted successfully.' } };
    } else {
      throw new Error(`Unexpected response status: ${response.status}`);
    }
  } catch (error) {
    console.error(`Error deleting line item with ID: ${lineItemId}`, error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
    return {
      statusCode: error.response ? error.response.status : 500,
      body: { message: error.response?.data?.message || error.message }
    };
  }
};
