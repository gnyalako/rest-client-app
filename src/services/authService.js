const { AuthorizationCode, ClientCredentials } = require('simple-oauth2');
const jwt = require('jsonwebtoken');

/**
 * Generate headers for Basic authentication
 * @param {string} username - Username for Basic auth
 * @param {string} password - Password for Basic auth
 * @returns {Object} - Headers with Basic authentication
 */
function generateBasicAuthHeaders(username, password) {
  const base64Credentials = Buffer.from(`${username}:${password}`).toString('base64');
  return {
    'Authorization': `Basic ${base64Credentials}`
  };
}

/**
 * Generate headers for API Key authentication
 * @param {Object} config - API key configuration
 * @returns {Object} - Headers with API key
 */
function generateApiKeyHeaders(config) {
  const { name, value, in: location } = config;

  if (location === 'header') {
    return {
      [name]: value
    };
  } else if (location === 'query') {
    // Return empty headers for query params, they'll be added to the URL
    return {};
  }

  return {};
}

/**
 * Generate query parameters for API Key authentication
 * @param {Object} config - API key configuration
 * @returns {Object} - Query parameters with API key
 */
function generateApiKeyParams(config) {
  const { name, value, in: location } = config;

  if (location === 'query') {
    return {
      [name]: value
    };
  }

  return {};
}

/**
 * Generate headers for Bearer token authentication
 * @param {string} token - Bearer token
 * @returns {Object} - Headers with Bearer token
 */
function generateBearerTokenHeaders(token) {
  return {
    'Authorization': `Bearer ${token}`
  };
}

/**
 * Initialize OAuth2 client
 * @param {Object} config - OAuth2 configuration
 * @returns {Object} - OAuth2 client
 */
function initializeOAuth2Client(config) {
  const { clientId, clientSecret, tokenHost, tokenPath, authorizePath } = config;
  
  let client;
  
  if (config.grantType === 'authorization_code') {
    client = new AuthorizationCode({
      client: {
        id: clientId,
        secret: clientSecret
      },
      auth: {
        tokenHost,
        tokenPath: tokenPath || '/oauth/token',
        authorizePath: authorizePath || '/oauth/authorize'
      }
    });
  } else if (config.grantType === 'client_credentials') {
    client = new ClientCredentials({
      client: {
        id: clientId,
        secret: clientSecret
      },
      auth: {
        tokenHost,
        tokenPath: tokenPath || '/oauth/token'
      }
    });
  }
  
  return client;
}

/**
 * Generate OAuth2 token using client credentials grant
 * @param {Object} client - OAuth2 client
 * @param {Object} config - Additional configuration
 * @returns {Promise<Object>} - OAuth2 token result
 */
async function getClientCredentialsToken(client, config) {
  try {
    const tokenParams = {
      scope: config.scope || ''
    };
    
    const result = await client.getToken(tokenParams);
    return result;
  } catch (error) {
    console.error('Error getting token:', error.message);
    throw error;
  }
}

/**
 * Verify and decode JWT token
 * @param {string} token - JWT token to verify
 * @param {string} secret - Secret key for verification (optional)
 * @returns {Object} - Decoded token payload
 */
function verifyJwtToken(token, secret) {
  try {
    // If no secret is provided, decode without verification
    if (!secret) {
      return jwt.decode(token);
    }
    
    return jwt.verify(token, secret);
  } catch (error) {
    console.error('Error verifying JWT token:', error.message);
    throw error;
  }
}

module.exports = {
  generateBasicAuthHeaders,
  generateApiKeyHeaders,
  generateApiKeyParams,
  generateBearerTokenHeaders,
  initializeOAuth2Client,
  getClientCredentialsToken,
  verifyJwtToken
}; 