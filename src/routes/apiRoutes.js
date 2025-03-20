const express = require('express');
const router = express.Router();
const openApiService = require('../services/openApiService');
const apiRequestService = require('../services/apiRequestService');
const authService = require('../services/authService');

// Store parsed OpenAPI spec in memory
let cachedApiSpec = null;

/**
 * Parse OpenAPI specification from URL
 */
router.post('/parse-spec', async (req, res) => {
  try {
    const { url } = req.body;
    
    if (!url) {
      return res.status(400).json({ error: 'OpenAPI specification URL is required' });
    }
    
    const apiSpec = await openApiService.parseOpenApiSpec(url);
    const endpoints = openApiService.getEndpoints(apiSpec);
    const securitySchemes = openApiService.getSecuritySchemes(apiSpec);
    const servers = openApiService.getServers(apiSpec);
    
    // Cache the parsed spec
    cachedApiSpec = {
      spec: apiSpec,
      endpoints,
      securitySchemes,
      servers
    };
    
    res.json({
      message: 'OpenAPI specification parsed successfully',
      info: apiSpec.info,
      endpoints,
      securitySchemes,
      servers
    });
  } catch (error) {
    console.error('Error parsing OpenAPI spec:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get parsed OpenAPI spec info
 */
router.get('/spec-info', (req, res) => {
  if (!cachedApiSpec) {
    return res.status(404).json({ error: 'No OpenAPI specification has been parsed yet' });
  }
  
  res.json({
    info: cachedApiSpec.spec.info,
    endpoints: cachedApiSpec.endpoints,
    securitySchemes: cachedApiSpec.securitySchemes,
    servers: cachedApiSpec.servers
  });
});

/**
 * Execute API request
 */
router.post('/execute', async (req, res) => {
  try {
    const { url, method, headers, data, params, auth, path, paramValues } = req.body;
    
    if (!url || !method) {
      return res.status(400).json({ error: 'URL and method are required' });
    }
    
    // Format parameters if endpoint is from OpenAPI spec
    let formattedParams = { pathParams: {}, queryParams: params || {} };
    let finalUrl = url;
    
    if (cachedApiSpec && path) {
      // Find the endpoint from the cached spec
      const endpoint = cachedApiSpec.endpoints.find(e => 
        e.path === path && e.method.toLowerCase() === method.toLowerCase()
      );
      
      if (endpoint) {
        formattedParams = apiRequestService.formatRequestParameters(endpoint.parameters, paramValues || {});
        finalUrl = apiRequestService.constructUrl(url, path, formattedParams.pathParams);
      }
    }
    
    // Build the request config
    const requestConfig = {
      url: finalUrl,
      method,
      headers: { ...formattedParams.headerParams, ...headers },
      params: formattedParams.queryParams,
      data: data || formattedParams.bodyParams,
      auth
    };
    
    const response = await apiRequestService.executeRequest(requestConfig);
    
    res.json(response);
  } catch (error) {
    console.error('Error executing API request:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Generate OAuth2 token
 */
router.post('/auth/oauth2/token', async (req, res) => {
  try {
    const { clientId, clientSecret, tokenHost, tokenPath, grantType, scope } = req.body;
    
    if (!clientId || !clientSecret || !tokenHost || !grantType) {
      return res.status(400).json({ error: 'Required OAuth2 parameters are missing' });
    }
    
    const client = authService.initializeOAuth2Client({
      clientId,
      clientSecret,
      tokenHost,
      tokenPath,
      grantType
    });
    
    if (!client) {
      return res.status(400).json({ error: 'Failed to initialize OAuth2 client' });
    }
    
    let result;
    
    if (grantType === 'client_credentials') {
      result = await authService.getClientCredentialsToken(client, { scope });
    } else {
      return res.status(400).json({ error: `Unsupported grant type: ${grantType}` });
    }
    
    res.json(result);
  } catch (error) {
    console.error('Error generating OAuth2 token:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Decode JWT token
 */
router.post('/auth/decode-jwt', (req, res) => {
  try {
    const { token, secret } = req.body;
    
    if (!token) {
      return res.status(400).json({ error: 'Token is required' });
    }
    
    const decoded = authService.verifyJwtToken(token, secret);
    
    res.json({ decoded });
  } catch (error) {
    console.error('Error decoding JWT token:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router; 