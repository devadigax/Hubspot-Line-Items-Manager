const axios = require("axios");

exports.main = async (context = {}) => {
  const { dealId } = context.parameters;
  const HUBSPOT_API_KEY = process.env.PRIVATE_APP_ACCESS_TOKEN; // Assuming you're using env vars
  let lineItemIds = [];

  try {
    const response = await axios.get(
      `https://api.hubspot.com/crm/v3/objects/deals/${dealId}/associations/line_items`,
      {
        headers: {
          'Authorization': `Bearer ${HUBSPOT_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );
    lineItemIds = response.data.results;
  } catch (error) {
    console.error("Error fetching line item IDs:", error.response?.data || error.message);
    return null;
  }
  console.log("Line item IDs fetched successfully:", lineItemIds);

  try {
    const lineItemsPromises = lineItemIds.map(lineItemId =>
      axios.get(`https://api.hubapi.com/crm/v3/objects/line_items/${lineItemId.id}`, {
        params: {
          properties: `name,lineItemId,hs_object_id,hs_sku,country,prod_size,survey_language,line_item_description,price,amount,rate_type,department,description,quantity,prodege_property,loi__target_,incidence____target_,loi,ir,start_date,end_date,system1_pricing,system1_survey_path,vertical,currency,netsuite_invoice__,invoice_date,status,sample_line_item_breakdown`
        },
        headers: {
          'Authorization': `Bearer ${HUBSPOT_API_KEY}`,
          'Content-Type': 'application/json'
        }
      })
    );

    const lineItemsResponses = await Promise.all(lineItemsPromises);
    const lineItems = lineItemsResponses.map(response => response.data);

    console.log("Line item details fetched successfully:", lineItems);

    return lineItems.map(item => {
      if (item.properties) {
        Object.assign(item, item.properties);
        delete item.properties;
      }
      return item;
    });
  } catch (error) {
    console.error("Error fetching line item details:", error.response?.data || error.message);
    return null;
  }
};