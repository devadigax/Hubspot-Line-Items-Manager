const axios = require("axios");

const HUBSPOT_API_KEY = process.env.PRIVATE_APP_ACCESS_TOKEN; // Secure key handling

exports.main = async (context = {}) => {
  const { lineItemId, dealId, prod_size, prodege_property, name, survey_language, hs_sku, netsuite_invoice__, system1_survey_path, sample_line_item_breakdown, invoice_date, status, system1_pricing, currency, description, price, quantity, rate_type, department, offer, amount, loi__target_, incidence____target_, start_date, end_date, country, vertical } = context.parameters;

  try {
    if (lineItemId) {
      const updateResponse = await axios.patch(
        `https://api.hubapi.com/crm/v3/objects/line_items/${lineItemId}`,
        {
          properties: {
            prodege_property,
            prod_size,
            name,
            country,
            survey_language,
            description,
            price,
            rate_type,
            loi__target_,
            incidence____target_,
            start_date,
            end_date,
            quantity,
            net_price: amount,
            department,
            offer,
            vertical,
            hs_sku,
            currency,
            netsuite_invoice__,
            invoice_date,
            status,
            system1_pricing,
            system1_survey_path,
            sample_line_item_breakdown
          },
        },
        {
          headers: {
            'Authorization': `Bearer ${HUBSPOT_API_KEY}`,
            'Content-Type': 'application/json'
          }
        }
      );

      console.log(`✅ Line item updated successfully. ID: ${lineItemId}`);
      return { success: true, action: 'updated', lineItemId };
    } else {
      const createResponse = await axios.post(
        `https://api.hubapi.com/crm/v3/objects/line_items`,
        {
          properties: {
            prodege_property,
            prod_size,
            name,
            country,
            survey_language,
            description,
            price,
            rate_type,
            loi__target_,
            incidence____target_,
            start_date,
            end_date,
            quantity,
            net_price: amount,
            department,
            offer,
            vertical,
            hs_sku,
            currency,
            netsuite_invoice__,
            invoice_date,
            status,
            system1_pricing,
            system1_survey_path,
            sample_line_item_breakdown
          },
        },
        {
          headers: {
            'Authorization': `Bearer ${HUBSPOT_API_KEY}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const newLineItemId = createResponse.data.id;
      console.log(`✅ Line item created successfully. ID: ${newLineItemId}`);

      const associateResponse = await axios.put(
        `https://api.hubapi.com/crm/v3/objects/line_items/${newLineItemId}/associations/deals/${dealId}/line_item_to_deal`,
        {},
        {
          headers: {
            'Authorization': `Bearer ${HUBSPOT_API_KEY}`,
            'Content-Type': 'application/json'
          }
        }
      );

      console.log(`🔗 Line item ${newLineItemId} associated with deal ${dealId} successfully.`);
      return { success: true, action: 'created_and_associated', lineItemId: newLineItemId };
    }

  } catch (error) {
    if (error.response) {
      console.error('❌ HubSpot API Error:', error.response.data);
      return { success: false, error: error.response.data };
    } else {
      console.error('❌ Unexpected Error:', error.message);
      return { success: false, error: error.message };
    }
  }
};
