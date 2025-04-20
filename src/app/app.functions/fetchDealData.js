const axios = require('axios');

const HUBSPOT_API_KEY = process.env.PRIVATE_APP_ACCESS_TOKEN; // Secure key handling

// Function to fetch the current deal details
const fetchDealDetails = async (dealId) => {
  try {
    const response = await axios.get(`https://api.hubapi.com/crm/v3/objects/deals/${dealId}`, {
      headers: {
        'Authorization': `Bearer ${HUBSPOT_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });
    console.log("Deal details fetched successfully:", response.data);
    return response.data;
  } catch (error) {
    console.error("Error fetching deal details:", error.response?.data || error.message);
    throw new Error("Failed to fetch deal details.");
  }
};

// Function to update the deal amount
const updateDealAmount = async (dealId, totalNetPrice) => {
  try {
    const response = await axios.patch(
      `https://api.hubapi.com/crm/v3/objects/deals/${dealId}`,
      {
        properties: {
          amount: totalNetPrice.toString(),
        }
      },
      {
        headers: {
          'Authorization': `Bearer ${HUBSPOT_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );
    console.log("Deal amount updated successfully:", response.data);
    return response.data;
  } catch (error) {
    console.error("Error updating deal amount:", error.response?.data || error.message);
    throw new Error("Failed to update deal amount.");
  }
};

// Main function to be called by the serverless framework
exports.main = async (context = {}) => {
  const { dealId, amount } = context.parameters;

  if (!dealId) {
    throw new Error("dealId is required.");
  }

  if (amount === undefined) {
    // If amount is not provided, just fetch the deal details
    return await fetchDealDetails(dealId);
  } else {
    // If amount is provided, update the deal amount
    return await updateDealAmount(dealId, amount);
  }
};
