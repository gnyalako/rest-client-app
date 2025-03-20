const axios = require('axios');
const authService = require('./authService');

/**
 * Execute an API request with the provided configuration
 * @param {Object} config - Request configuration
 * @returns {Promise<Object>} - API response
 */
async function executeRequest(config) {
  try {
    const { url, method, headers, data, params, auth } = config;
    
    // Initialize request configuration
    const requestConfig = {
      url,
      method: method.toLowerCase(),
      headers: headers || {},
      params: params || {},
      validateStatus: () => true // Accept any status code to handle them later
    };
    
    // Add request body if present
    if (data) {
      requestConfig.data = data;
    }
    
    // Apply authentication if present
    if (auth) {
      applyAuthentication(requestConfig, auth);
    }
    
    console.log('Executing request with config:', requestConfig);
    
    // Execute the request
    const response = await axios(requestConfig);
    
    return {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
      data: response.data,
      config: response.config
    };
  } catch (error) {
    console.error('Error executing API request:', error);
    
    // Return error response in a consistent format
    return {
      status: error.response?.status || 500,
      statusText: error.response?.statusText || error.message,
      headers: error.response?.headers || {},
      data: error.response?.data || { error: error.message },
      config: error.config || {}
    };
  }
}

/**
 * Apply authentication to the request configuration
 * @param {Object} requestConfig - Axios request configuration
 * @param {Object} auth - Authentication configuration
 */
function applyAuthentication(requestConfig, auth) {
  const { type } = auth;
  
  switch (type) {
    case 'basic':
      const basicAuthHeaders = authService.generateBasicAuthHeaders(auth.username, auth.password);
      requestConfig.headers = { ...requestConfig.headers, ...basicAuthHeaders };
      break;
      
    case 'bearer':
      const bearerHeaders = authService.generateBearerTokenHeaders(auth.token);
      requestConfig.headers = { ...requestConfig.headers, ...bearerHeaders };
      break;
      
    case 'apiKey':
      const apiKeyHeaders = authService.generateApiKeyHeaders(auth);
      const apiKeyParams = authService.generateApiKeyParams(auth);
      
      requestConfig.headers = { ...requestConfig.headers, ...apiKeyHeaders };
      requestConfig.params = { ...requestConfig.params, ...apiKeyParams };
      break;
      
    case 'oauth2':
      // OAuth2 token should already be obtained and passed as a bearer token
      const oauth2Headers = authService.generateBearerTokenHeaders(auth.token);
      requestConfig.headers = { ...requestConfig.headers, ...oauth2Headers };
      break;
      
    default:
      console.warn(`Unknown authentication type: ${type}`);
  }
}

/**
 * Format request parameters from OpenAPI specification
 * @param {Array} parameters - OpenAPI parameters
 * @param {Object} values - Parameter values
 * @returns {Object} - Formatted parameters
 */
function formatRequestParameters(parameters, values) {
  const result = {
    pathParams: {},
    queryParams: {},
    headerParams: {},
    bodyParams: {}
  };
  
  if (!parameters || !Array.isArray(parameters)) {
    return result;
  }
  
  parameters.forEach(param => {
    const value = values[param.name];
    if (value !== undefined) {
      switch (param.in) {
        case 'path':
          result.pathParams[param.name] = value;
          break;
        case 'query':
          result.queryParams[param.name] = value;
          break;
        case 'header':
          result.headerParams[param.name] = value;
          break;
        case 'body':
          result.bodyParams = value;
          break;
        case 'formData':
          if (!result.bodyParams) result.bodyParams = {};
          result.bodyParams[param.name] = value;
          break;
      }
    }
  });
  
  return result;
}

/**
 * Construct the final URL with path parameters
 * @param {string} url - Base URL
 * @param {string} path - Path with parameter placeholders
 * @param {Object} pathParams - Path parameter values
 * @returns {string} - Final URL
 */
function constructUrl(url, path, pathParams) {
  let finalPath = path;
  
  // Replace path parameters
  for (const [param, value] of Object.entries(pathParams)) {
    finalPath = finalPath.replace(`{${param}}`, encodeURIComponent(value));
  }
  
  // Ensure URL doesn't end with slash and path doesn't start with slash (to avoid double slashes)
  const baseUrl = url.endsWith('/') ? url.slice(0, -1) : url;
  const formattedPath = finalPath.startsWith('/') ? finalPath : `/${finalPath}`;
  
  return `${baseUrl}${formattedPath}`;
}

module.exports = {
  executeRequest,
  formatRequestParameters,
  constructUrl
}; 