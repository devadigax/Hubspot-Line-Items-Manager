// fetchUserData.js
const axios = require('axios');

exports.main = async (context = {}) => {
  const { userId } = context.parameters;
  const HUBSPOT_API_KEY = process.env.PRIVATE_APP_ACCESS_TOKEN; // or however you're handling secrets

  try {
    const response = await axios.get(`https://api.hubspot.com/settings/v3/users/roles`, {
      headers: {
        'Authorization': `Bearer ${HUBSPOT_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('User Roles:', response.data);

    return response.data;
  } catch (error) {
    if (error.response) {
      console.error('API Error:', error.response.status, error.response.data);
      throw new Error(`API Error: ${error.response.status}`);
    } else if (error.request) {
      console.error('Request Error:', error.request);
      throw new Error('Request Error: No response received');
    } else {
      console.error('Error:', error.message);
      throw new Error(`Error: ${error.message}`);
    }
  }
};