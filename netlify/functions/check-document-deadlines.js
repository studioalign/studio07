const { checkDocumentDeadlines } = require('../utils/documentUtils');

exports.handler = async (event, context) => {
  try {
    await checkDocumentDeadlines();
    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Document deadline check completed' })
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to check document deadlines' })
    };
  }
};