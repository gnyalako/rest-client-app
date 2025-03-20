const SwaggerParser = require('swagger-parser');
const axios = require('axios');

/**
 * Parse OpenAPI specifications from a URL
 * @param {string} url - URL to fetch the OpenAPI spec from
 * @returns {Promise<Object>} - Parsed OpenAPI specification
 */
async function parseOpenApiSpec(url) {
  try {
    // First, try to directly dereference the spec
    try {
      const api = await SwaggerParser.dereference(url);
      return api;
    } catch (error) {
      // If direct dereferencing fails, try to fetch the content first
      console.log('Direct parsing failed, fetching content first...');
      const response = await axios.get(url);
      const api = await SwaggerParser.dereference(response.data);
      return api;
    }
  } catch (error) {
    console.error('Error parsing OpenAPI spec:', error);
    throw new Error(`Failed to parse OpenAPI specification: ${error.message}`);
  }
}

/**
 * Get endpoints from parsed OpenAPI spec
 * @param {Object} apiSpec - Parsed OpenAPI specification
 * @returns {Array} - List of endpoints
 */
function getEndpoints(apiSpec) {
  const endpoints = [];
  const basePath = apiSpec.basePath || '';
  const paths = apiSpec.paths || {};

  for (const path in paths) {
    const pathItem = paths[path];
    for (const method in pathItem) {
      if (['get', 'post', 'put', 'delete', 'patch', 'options', 'head'].includes(method)) {
        const operation = pathItem[method];
        
        endpoints.push({
          path: `${basePath}${path}`,
          method: method.toUpperCase(),
          operationId: operation.operationId || `${method}${path}`,
          summary: operation.summary || '',
          description: operation.description || '',
          parameters: operation.parameters || [],
          responses: operation.responses || {},
          security: operation.security || apiSpec.security || []
        });
      }
    }
  }

  return endpoints;
}

/**
 * Get security schemes from parsed OpenAPI spec
 * @param {Object} apiSpec - Parsed OpenAPI specification
 * @returns {Object} - Security schemes
 */
function getSecuritySchemes(apiSpec) {
  // OpenAPI 3.0+
  if (apiSpec.components && apiSpec.components.securitySchemes) {
    return apiSpec.components.securitySchemes;
  }
  
  // Swagger 2.0
  if (apiSpec.securityDefinitions) {
    return apiSpec.securityDefinitions;
  }
  
  return {};
}

/**
 * Get server information from OpenAPI spec
 * @param {Object} apiSpec - Parsed OpenAPI specification
 * @returns {Array} - Server URLs
 */
function getServers(apiSpec) {
  // OpenAPI 3.0+
  if (apiSpec.servers && apiSpec.servers.length > 0) {
    return apiSpec.servers.map(server => server.url);
  }
  
  // Swagger 2.0
  if (apiSpec.host) {
    const scheme = (apiSpec.schemes && apiSpec.schemes[0]) || 'https';
    return [`${scheme}://${apiSpec.host}${apiSpec.basePath || ''}`];
  }
  
  return [''];
}

module.exports = {
  parseOpenApiSpec,
  getEndpoints,
  getSecuritySchemes,
  getServers
}; 