document.addEventListener('DOMContentLoaded', () => {
  // DOM Elements
  const openApiUrlInput = document.getElementById('openapi-url');
  const parseOpenApiBtn = document.getElementById('parse-openapi-btn');
  const endpointsList = document.getElementById('endpoints-list');
  const endpointTitle = document.getElementById('endpoint-title');
  const requestMethodSelect = document.getElementById('request-method');
  const requestUrlInput = document.getElementById('request-url');
  const sendRequestBtn = document.getElementById('send-request-btn');
  const responseStatus = document.getElementById('response-status');
  const responseBody = document.getElementById('response-body');
  const responseHeaders = document.getElementById('response-headers');
  const authTypeSelect = document.getElementById('auth-type');
  const authForms = document.querySelectorAll('.auth-form');
  const bodyEditor = document.getElementById('body-editor');
  const bodyContentTypeSelect = document.getElementById('body-content-type');
  const addHeaderBtn = document.getElementById('add-header-btn');
  const headersContainer = document.getElementById('headers-container');
  const addParamBtn = document.getElementById('add-param-btn');
  const paramsContainer = document.getElementById('params-container');
  const getOAuth2TokenBtn = document.getElementById('get-oauth2-token-btn');

  // State
  let currentOpenApiSpec = null;
  let currentEndpoint = null;
  let currentParameters = {};

  // Initialize
  init();

  function init() {
    // Event listeners
    parseOpenApiBtn.addEventListener('click', parseOpenApiSpec);
    sendRequestBtn.addEventListener('click', sendRequest);
    authTypeSelect.addEventListener('change', updateAuthForm);
    addHeaderBtn.addEventListener('click', addHeaderField);
    addParamBtn.addEventListener('click', addParamField);
    getOAuth2TokenBtn.addEventListener('click', getOAuth2Token);
    
    // Populate headers and params with initial fields
    addHeaderField();
    addParamField();
  }

  async function parseOpenApiSpec() {
    const url = openApiUrlInput.value.trim();
    
    if (!url) {
      alert('Please enter an OpenAPI specification URL');
      return;
    }
    
    try {
      const response = await fetch('/api/parse-spec', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ url })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        currentOpenApiSpec = data;
        populateEndpoints(data.endpoints);
        alert('OpenAPI specification parsed successfully!');
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (error) {
      console.error('Error parsing OpenAPI spec:', error);
      alert(`Error: ${error.message}`);
    }
  }

  function populateEndpoints(endpoints) {
    endpointsList.innerHTML = '';
    
    if (!endpoints || endpoints.length === 0) {
      endpointsList.innerHTML = '<div class="text-muted small p-2">No endpoints found in the specification.</div>';
      return;
    }
    
    endpoints.forEach(endpoint => {
      const methodColor = getMethodColor(endpoint.method);
      
      const endpointElement = document.createElement('div');
      endpointElement.className = 'list-group-item endpoint-item';
      endpointElement.innerHTML = `
        <div class="d-flex align-items-center">
          <span class="badge method-badge ${methodColor} me-2">${endpoint.method}</span>
          <div>
            <div class="fw-bold">${endpoint.path}</div>
            <small class="text-muted">${endpoint.summary || endpoint.operationId || ''}</small>
          </div>
        </div>
      `;
      
      endpointElement.addEventListener('click', () => selectEndpoint(endpoint));
      
      endpointsList.appendChild(endpointElement);
    });
  }

  function selectEndpoint(endpoint) {
    currentEndpoint = endpoint;
    
    // Update UI
    endpointTitle.textContent = `${endpoint.method} ${endpoint.path}`;
    requestMethodSelect.value = endpoint.method;
    
    // If servers are available, use the first one
    const baseUrl = currentOpenApiSpec.servers && currentOpenApiSpec.servers.length > 0
      ? currentOpenApiSpec.servers[0]
      : '';
    
    requestUrlInput.value = baseUrl;
    
    // Update active class in the endpoints list
    const endpointItems = endpointsList.querySelectorAll('.endpoint-item');
    endpointItems.forEach(item => item.classList.remove('active'));
    event.currentTarget.classList.add('active');
    
    // Clear previous parameters
    currentParameters = {};
    
    // Populate parameter fields if any
    if (endpoint.parameters && endpoint.parameters.length > 0) {
      // Clear existing parameter fields
      paramsContainer.innerHTML = '';
      
      // Add fields for each parameter
      endpoint.parameters.forEach(param => {
        if (param.in === 'query' || param.in === 'path') {
          addParamField(param.name, '', param.required);
        } else if (param.in === 'header') {
          addHeaderField(param.name, '', param.required);
        }
      });
    }
  }

  async function sendRequest() {
    const method = requestMethodSelect.value;
    const url = requestUrlInput.value.trim();
    
    if (!url) {
      alert('Please enter a request URL');
      return;
    }
    
    try {
      // Collect headers
      const headers = {};
      const headerElements = headersContainer.querySelectorAll('.key-value-pair');
      headerElements.forEach(element => {
        const key = element.querySelector('.header-key').value.trim();
        const value = element.querySelector('.header-value').value.trim();
        if (key && value) {
          headers[key] = value;
        }
      });
      
      // Add content type header if body is present
      if (bodyEditor.value.trim()) {
        headers['Content-Type'] = bodyContentTypeSelect.value;
      }
      
      // Collect query parameters
      const params = {};
      const paramElements = paramsContainer.querySelectorAll('.key-value-pair');
      paramElements.forEach(element => {
        const key = element.querySelector('.param-key').value.trim();
        const value = element.querySelector('.param-value').value.trim();
        if (key && value) {
          params[key] = value;
        }
      });
      
      // Prepare request body
      let data = null;
      if (bodyEditor.value.trim()) {
        try {
          if (bodyContentTypeSelect.value === 'application/json') {
            data = JSON.parse(bodyEditor.value);
          } else {
            data = bodyEditor.value;
          }
        } catch (error) {
          console.error('Error parsing body as JSON:', error);
          alert('Error parsing body as JSON. Please check the syntax.');
          return;
        }
      }
      
      // Get authentication details
      const auth = getAuthDetails();
      
      // Build request payload
      const requestPayload = {
        method,
        url,
        headers,
        params,
        data,
        auth
      };
      
      // Add path and paramValues if using an endpoint from the OpenAPI spec
      if (currentEndpoint) {
        requestPayload.path = currentEndpoint.path;
        requestPayload.paramValues = collectParameterValues();
      }
      
      // Update UI to show loading state
      responseStatus.innerHTML = '<span class="badge bg-secondary">Loading...</span>';
      responseBody.textContent = '';
      responseHeaders.textContent = '';
      
      // Send the request
      const response = await fetch('/api/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestPayload)
      });
      
      const responseData = await response.json();
      
      // Update UI with response
      updateResponseUI(responseData);
    } catch (error) {
      console.error('Error sending request:', error);
      responseStatus.innerHTML = `<span class="badge bg-danger">Error: ${error.message}</span>`;
      responseBody.textContent = error.message;
      responseHeaders.textContent = '';
    }
  }

  function updateResponseUI(response) {
    // Update status badge
    const statusClass = getStatusClass(response.status);
    responseStatus.innerHTML = `
      <span class="badge ${statusClass}">
        ${response.status} ${response.statusText}
      </span>
    `;
    
    // Update headers
    let headersText = '';
    if (response.headers) {
      for (const [key, value] of Object.entries(response.headers)) {
        headersText += `${key}: ${value}\n`;
      }
    }
    responseHeaders.textContent = headersText;
    
    // Update body
    if (response.data) {
      try {
        if (typeof response.data === 'object') {
          responseBody.innerHTML = formatJson(response.data);
        } else if (typeof response.data === 'string') {
          // Try to parse as JSON if it looks like JSON
          if (response.data.trim().startsWith('{') || response.data.trim().startsWith('[')) {
            try {
              const jsonData = JSON.parse(response.data);
              responseBody.innerHTML = formatJson(jsonData);
            } catch (e) {
              responseBody.textContent = response.data;
            }
          } else {
            responseBody.textContent = response.data;
          }
        } else {
          responseBody.textContent = JSON.stringify(response.data, null, 2);
        }
      } catch (error) {
        responseBody.textContent = String(response.data);
      }
    } else {
      responseBody.textContent = '';
    }
  }

  function getAuthDetails() {
    const authType = authTypeSelect.value;
    
    if (authType === 'none') {
      return null;
    }
    
    switch (authType) {
      case 'basic':
        const username = document.getElementById('basic-username').value.trim();
        const password = document.getElementById('basic-password').value.trim();
        if (username && password) {
          return { type: 'basic', username, password };
        }
        break;
        
      case 'bearer':
        const token = document.getElementById('bearer-token').value.trim();
        if (token) {
          return { type: 'bearer', token };
        }
        break;
        
      case 'apiKey':
        const name = document.getElementById('api-key-name').value.trim();
        const value = document.getElementById('api-key-value').value.trim();
        const location = document.getElementById('api-key-location').value;
        if (name && value) {
          return { type: 'apiKey', name, value, in: location };
        }
        break;
        
      case 'oauth2':
        const oauth2Token = document.getElementById('bearer-token').value.trim();
        if (oauth2Token) {
          return { type: 'oauth2', token: oauth2Token };
        }
        break;
    }
    
    return null;
  }

  function updateAuthForm() {
    const authType = authTypeSelect.value;
    
    // Hide all auth forms
    authForms.forEach(form => {
      form.style.display = 'none';
    });
    
    // Show the selected auth form
    if (authType !== 'none') {
      const selectedForm = document.getElementById(`${authType}-auth-form`);
      if (selectedForm) {
        selectedForm.style.display = 'block';
      }
    }
  }

  function addHeaderField(name = '', value = '', required = false) {
    const headerPair = document.createElement('div');
    headerPair.className = 'key-value-pair';
    headerPair.innerHTML = `
      <input type="text" class="form-control header-key" placeholder="Header name" value="${name}" ${required ? 'required' : ''}>
      <input type="text" class="form-control header-value" placeholder="Header value" value="${value}" ${required ? 'required' : ''}>
      <button type="button" class="btn btn-outline-danger btn-sm btn-remove">
        <i class="bi bi-x"></i>
      </button>
    `;
    
    headerPair.querySelector('.btn-remove').addEventListener('click', () => {
      headerPair.remove();
    });
    
    headersContainer.appendChild(headerPair);
  }

  function addParamField(name = '', value = '', required = false) {
    const paramPair = document.createElement('div');
    paramPair.className = 'key-value-pair';
    paramPair.innerHTML = `
      <input type="text" class="form-control param-key" placeholder="Parameter name" value="${name}" ${required ? 'required' : ''}>
      <input type="text" class="form-control param-value" placeholder="Parameter value" value="${value}" ${required ? 'required' : ''}>
      <button type="button" class="btn btn-outline-danger btn-sm btn-remove">
        <i class="bi bi-x"></i>
      </button>
    `;
    
    paramPair.querySelector('.btn-remove').addEventListener('click', () => {
      paramPair.remove();
    });
    
    paramsContainer.appendChild(paramPair);
  }

  async function getOAuth2Token() {
    const grantType = document.getElementById('oauth2-grant-type').value;
    const tokenUrl = document.getElementById('oauth2-token-url').value.trim();
    const clientId = document.getElementById('oauth2-client-id').value.trim();
    const clientSecret = document.getElementById('oauth2-client-secret').value.trim();
    const scope = document.getElementById('oauth2-scope').value.trim();
    
    if (!tokenUrl || !clientId || !clientSecret) {
      alert('Please fill in the required OAuth2 fields');
      return;
    }
    
    try {
      const response = await fetch('/api/auth/oauth2/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          grantType,
          tokenHost: new URL(tokenUrl).origin,
          tokenPath: new URL(tokenUrl).pathname,
          clientId,
          clientSecret,
          scope
        })
      });
      
      const data = await response.json();
      
      if (response.ok && data.token) {
        // Update the bearer token input
        document.getElementById('bearer-token').value = data.token.access_token;
        
        // Switch to bearer token auth type
        authTypeSelect.value = 'bearer';
        updateAuthForm();
        
        alert('OAuth2 token generated successfully!');
      } else {
        alert(`Error: ${data.error || 'Failed to generate token'}`);
      }
    } catch (error) {
      console.error('Error getting OAuth2 token:', error);
      alert(`Error: ${error.message}`);
    }
  }

  function collectParameterValues() {
    const values = {};
    
    if (!currentEndpoint || !currentEndpoint.parameters) {
      return values;
    }
    
    // Collect from path and query parameters
    const paramElements = paramsContainer.querySelectorAll('.key-value-pair');
    paramElements.forEach(element => {
      const key = element.querySelector('.param-key').value.trim();
      const value = element.querySelector('.param-value').value.trim();
      if (key && value) {
        values[key] = value;
      }
    });
    
    // Collect from header parameters
    const headerElements = headersContainer.querySelectorAll('.key-value-pair');
    headerElements.forEach(element => {
      const key = element.querySelector('.header-key').value.trim();
      const value = element.querySelector('.header-value').value.trim();
      if (key && value) {
        values[key] = value;
      }
    });
    
    // Collect from body parameters
    if (bodyEditor.value.trim()) {
      try {
        if (bodyContentTypeSelect.value === 'application/json') {
          values.body = JSON.parse(bodyEditor.value);
        } else {
          values.body = bodyEditor.value;
        }
      } catch (error) {
        console.error('Error parsing body:', error);
      }
    }
    
    return values;
  }

  function getMethodColor(method) {
    method = method.toLowerCase();
    switch (method) {
      case 'get': return 'method-get';
      case 'post': return 'method-post';
      case 'put': return 'method-put';
      case 'delete': return 'method-delete';
      case 'patch': return 'method-patch';
      default: return 'bg-secondary';
    }
  }

  function getStatusClass(status) {
    if (status >= 200 && status < 300) {
      return 'bg-success status-success';
    } else if (status >= 300 && status < 400) {
      return 'bg-secondary status-redirect';
    } else if (status >= 400 && status < 500) {
      return 'bg-warning status-error';
    } else if (status >= 500) {
      return 'bg-danger status-error';
    } else {
      return 'bg-info status-info';
    }
  }

  function formatJson(obj) {
    return syntaxHighlight(JSON.stringify(obj, null, 2));
  }

  function syntaxHighlight(json) {
    json = json.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    return json.replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, match => {
      let cls = 'json-value-number';
      if (/^"/.test(match)) {
        if (/:$/.test(match)) {
          cls = 'json-key';
        } else {
          cls = 'json-value-string';
        }
      } else if (/true|false/.test(match)) {
        cls = 'json-value-boolean';
      } else if (/null/.test(match)) {
        cls = 'json-value-null';
      }
      return `<span class="${cls}">${match}</span>`;
    });
  }
}); 