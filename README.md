# REST Client Application

A powerful REST client application built with Node.js that supports OpenAPI specifications.

## Features

- Parse OpenAPI specifications from URLs
- Execute REST API calls with customizable parameters
- Support for different authentication mechanisms:
  - Basic Authentication
  - Bearer Token
  - API Key
  - OAuth 2.0 (Client Credentials)
- Display detailed API responses (status, headers, body)
- JSON syntax highlighting for responses
- Customizable headers and query parameters

## Installation

1. Clone this repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file in the root directory (or use the existing one):
   ```
   PORT=3000
   NODE_ENV=development
   ```

## Usage

### Start in Development Mode

```bash
npm run dev
```

This will start the application with nodemon, which will automatically restart the server when files change.

### Start in Production Mode

```bash
npm start
```

### Accessing the Application

Once started, access the application at:

```
http://localhost:3000
```

## How to Use

1. Enter the URL of an OpenAPI specification and click "Parse"
2. Select an endpoint from the list that appears on the left
3. Configure request parameters:
   - Method and URL
   - Authentication details
   - Headers
   - Query parameters
   - Request body
4. Click "Send" to execute the request
5. View the response (status, headers, and body)

## OpenAPI Support

The application supports both Swagger 2.0 and OpenAPI 3.0 specifications. You can provide a URL to a raw JSON or YAML specification file.

Example OpenAPI URLs to try:
- Petstore: https://petstore.swagger.io/v2/swagger.json
- GitHub API: https://raw.githubusercontent.com/github/rest-api-description/main/descriptions/api.github.com/api.github.com.json

## Authentication Support

### Basic Auth
Enter username and password for Basic Authentication.

### Bearer Token
Provide a JWT or other token to be sent in the Authorization header.

### API Key
Configure name, value, and location (header or query parameter) for the API key.

### OAuth 2.0
Configure client credentials and token URL to obtain OAuth tokens.

## License

ISC 