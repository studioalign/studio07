const { schedule } = require('@netlify/functions');
const { checkDocumentDeadlines } = require('../../src/utils/documentUtils');

module.exports.handler = schedule('0 0 * * *', async () => {
  try {
    await checkDocumentDeadlines();
    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Document deadline check completed' })
    };
  } catch (error) {
    console.error('Deadline check error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to check document deadlines' })
    };
  }
});