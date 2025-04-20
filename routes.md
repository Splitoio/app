# Splito API Routes Documentation

This document outlines all the API endpoints available in the Splito backend service, with their request parameters and response formats.

## Base URL

```
http://localhost:3000/api
```

## Currency Routes

### Get Fiat Currencies

Returns a list of all available fiat currencies.

- **URL**: `/currency/fiat`
- **Method**: `GET`
- **Response**: Array of fiat currency objects
  ```json
  [
    {
      "code": "USD",
      "name": "United States Dollar",
      "symbol": "$"
    },
    ...
  ]
  ```

### Get All Currencies

Returns a list of all available currencies, including fiat and tokens.

- **URL**: `/currency/all`
- **Method**: `GET`
- **Response**: Array of currency objects
  ```json
  [
    {
      "type": "FIAT",
      "code": "USD",
      "name": "United States Dollar",
      "symbol": "$"
    },
    {
      "type": "TOKEN",
      "code": "BTC",
      "name": "Bitcoin",
      "symbol": "₿",
      "chainId": "bitcoin"
    },
    ...
  ]
  ```

### Get Exchange Rate

Gets the current exchange rate between two currencies.

- **URL**: `/currency/rate`
- **Method**: `GET`
- **Query Parameters**:
  - `fromCurrency` (string): Source currency code
  - `toCurrency` (string): Target currency code
  - `fromType` (string): Type of source currency (`FIAT` or `TOKEN`)
  - `toType` (string): Type of target currency (`FIAT` or `TOKEN`)
  - `fromChainId` (string, optional): Chain ID for source token
  - `toChainId` (string, optional): Chain ID for target token
- **Response**:
  ```json
  {
    "rate": 0.92
  }
  ```

### Convert Amount

Converts an amount from one currency to another.

- **URL**: `/currency/convert`
- **Method**: `GET`
- **Query Parameters**:
  - `amount` (number): The amount to convert
  - `fromCurrency` (string): Source currency code
  - `toCurrency` (string): Target currency code
  - `fromType` (string): Type of source currency (`FIAT` or `TOKEN`)
  - `toType` (string): Type of target currency (`FIAT` or `TOKEN`)
  - `fromChainId` (string, optional): Chain ID for source token
  - `toChainId` (string, optional): Chain ID for target token
- **Response**:
  ```json
  {
    "amount": 92.0
  }
  ```

## Enhanced Expense Routes

### Create Enhanced Expense

Creates a new expense with support for multiple currency types and time lock-in.

- **URL**: `/enhanced-expense`
- **Method**: `POST`
- **Body**:
  ```json
  {
    "groupId": "group-id-123",
    "paidBy": "user-id-123",
    "name": "Group Dinner",
    "category": "Food",
    "amount": 100.5,
    "splitType": "EQUAL",
    "currency": "USD",
    "currencyType": "FIAT",
    "timeLockIn": true,
    "participants": [
      {
        "userId": "user-id-123",
        "amount": 50.25
      },
      {
        "userId": "user-id-456",
        "amount": 50.25
      }
    ],
    "expenseDate": "2023-08-15T12:00:00Z"
  }
  ```
- **Response**:
  ```json
  {
    "id": "expense-id-123"
  }
  ```

### Get Enhanced Expenses

Gets all expenses for a group with converted values based on time lock-in.

- **URL**: `/enhanced-expense/:groupId`
- **Method**: `GET`
- **URL Parameters**:
  - `groupId` (string): ID of the group to get expenses for
- **Query Parameters**:
  - `targetCurrency` (string, optional): Currency to convert expense values to
- **Response**: Array of expense objects
  ```json
  [
    {
      "id": "expense-id-123",
      "groupId": "group-id-123",
      "paidBy": "user-id-123",
      "name": "Group Dinner",
      "category": "Food",
      "amount": 100.50,
      "convertedAmount": 92.46,
      "splitType": "EQUAL",
      "currency": "USD",
      "currencyType": "FIAT",
      "timeLockIn": true,
      "participants": [
        {
          "userId": "user-id-123",
          "amount": 50.25,
          "convertedAmount": 46.23
        },
        {
          "userId": "user-id-456",
          "amount": 50.25,
          "convertedAmount": 46.23
        }
      ],
      "expenseDate": "2023-08-15T12:00:00Z"
    },
    ...
  ]
  ```

## Multichain Routes

### Get Available Chains

Gets all available blockchain networks.

- **URL**: `/multichain/chains`
- **Method**: `GET`
- **Response**: Array of chain objects
  ```json
  [
    {
      "id": "ethereum",
      "name": "Ethereum",
      "symbol": "ETH",
      "logoUrl": "https://example.com/eth.png"
    },
    ...
  ]
  ```

### Get Available Tokens

Gets all available tokens for a specific blockchain network.

- **URL**: `/multichain/tokens/:chainId`
- **Method**: `GET`
- **URL Parameters**:
  - `chainId` (string): ID of the blockchain network
- **Response**: Array of token objects
  ```json
  [
    {
      "id": "eth",
      "name": "Ethereum",
      "symbol": "ETH",
      "chainId": "ethereum",
      "address": "0x0000000000000000000000000000000000000000"
    },
    ...
  ]
  ```

### Get All Chains and Tokens

Gets all chains and their available tokens in one request.

- **URL**: `/multichain/all-chains-tokens`
- **Method**: `GET`
- **Response**:
  ```json
  {
    "chains": [
      {
        "id": "ethereum",
        "name": "Ethereum",
        "symbol": "ETH",
        "logoUrl": "https://example.com/eth.png"
      },
      ...
    ],
    "tokens": {
      "ethereum": [
        {
          "id": "eth",
          "name": "Ethereum",
          "symbol": "ETH",
          "chainId": "ethereum",
          "address": "0x0000000000000000000000000000000000000000"
        },
        ...
      ],
      ...
    }
  }
  ```

### Get User Chain Accounts

Gets all blockchain accounts for the current user.

- **URL**: `/multichain/accounts`
- **Method**: `GET`
- **Response**: Array of account objects
  ```json
  [
    {
      "chainId": "ethereum",
      "address": "0x1234567890abcdef1234567890abcdef12345678",
      "isDefault": true
    },
    ...
  ]
  ```

### Add User Chain Account

Adds a new blockchain account for the current user.

- **URL**: `/multichain/accounts`
- **Method**: `POST`
- **Body**:
  ```json
  {
    "chainId": "ethereum",
    "address": "0x1234567890abcdef1234567890abcdef12345678",
    "isDefault": true
  }
  ```
- **Response**:
  ```json
  {
    "id": "account-id-123"
  }
  ```

### Create Multichain Settlement

Creates a new multichain settlement transaction.

- **URL**: `/multichain/settlements`
- **Method**: `POST`
- **Body**:
  ```json
  {
    "chainId": "ethereum",
    "tokenId": "eth",
    "groupId": "group-id-123",
    "transactions": [
      {
        "toUserId": "user-id-456",
        "amount": "0.01",
        "description": "Debt settlement for dinner"
      }
    ]
  }
  ```
- **Response**:
  ```json
  {
    "transactionId": "tx-id-123"
  }
  ```

### Submit Multichain Settlement

Submits a signed multichain settlement transaction.

- **URL**: `/multichain/settlements/submit`
- **Method**: `POST`
- **Body**:
  ```json
  {
    "transactionId": "tx-id-123",
    "signedTx": "0x..."
  }
  ```
- **Response**:
  ```json
  {
    "txHash": "0x..."
  }
  ```

## Pricing Routes

### Get Price

Gets the current price of a token or currency.

- **URL**: `/pricing/price`
- **Method**: `GET`
- **Query Parameters**:
  - `id` (string): ID of the token/currency
  - `baseCurrency` (string): Base currency for price
- **Response**:
  ```json
  {
    "price": 42000.5
  }
  ```

### Get Prices

Gets the prices of multiple tokens/currencies.

- **URL**: `/pricing/prices`
- **Method**: `GET`
- **Query Parameters**:
  - `ids` (string): Comma-separated list of token/currency IDs
  - `baseCurrency` (string): Base currency for prices
- **Response**:
  ```json
  {
    "bitcoin": 42000.5,
    "ethereum": 2500.75
  }
  ```

### Get Historical Price

Gets the historical price of a token/currency.

- **URL**: `/pricing/historical`
- **Method**: `GET`
- **Query Parameters**:
  - `id` (string): ID of the token/currency
  - `baseCurrency` (string): Base currency for price
  - `date` (string): Date for historical price (ISO format)
- **Response**:
  ```json
  {
    "price": 38000.25
  }
  ```# Splito API Routes

## Base URL


https://server.splito.io


## Currency Routes

### Get Fiat Currencies

- *Method*: GET
- *URL*: /api/currency/fiat
- *Description*: Retrieve all supported fiat currencies

### Get All Currencies

- *Method*: GET
- *URL*: /api/currency/all
- *Description*: Retrieve all currencies (fiat and tokens)

### Get Exchange Rate

- *Method*: GET
- *URL*: /api/currency/rate
- *Query Parameters*:
  - fromCurrency (string): The source currency code
  - toCurrency (string): The target currency code
  - fromType (string): Type of the source currency (FIAT or TOKEN)
  - toType (string): Type of the target currency (FIAT or TOKEN)
  - fromChainId (string, optional): Chain ID for token (if applicable)
  - toChainId (string, optional): Chain ID for token (if applicable)
- *Description*: Get the exchange rate between two currencies

### Convert Amount

- *Method*: GET
- *URL*: /api/currency/convert
- *Query Parameters*:
  - amount (number): The amount to convert
  - fromCurrency (string): The source currency code
  - toCurrency (string): The target currency code
  - fromType (string): Type of the source currency (FIAT or TOKEN)
  - toType (string): Type of the target currency (FIAT or TOKEN)
  - fromChainId (string, optional): Chain ID for token (if applicable)
  - toChainId (string, optional): Chain ID for token (if applicable)
- *Description*: Convert an amount from one currency to another

## Enhanced Expense Routes

### Create Enhanced Expense

- *Method*: POST
- *URL*: /api/enhanced-expense
- *Body*:
  json
  {
    "groupId": "group-id-123",
    "paidBy": "user-id-123",
    "name": "Group Dinner",
    "category": "Food",
    "amount": 100.5,
    "splitType": "EQUAL",
    "currency": "USD",
    "currencyType": "FIAT",
    "timeLockIn": true,
    "participants": [
      {
        "userId": "user-id-123",
        "amount": 50.25
      },
      {
        "userId": "user-id-456",
        "amount": 50.25
      }
    ],
    "expenseDate": "2023-08-15T12:00:00Z"
  }
  
- *Description*: Create a new expense with support for multiple currency types and time lock-in

### Get Enhanced Expenses

- *Method*: GET
- *URL*: /api/enhanced-expense/:groupId
- *Query Parameters*:
  - targetCurrency (string): Currency to convert expense values to
- *Description*: Get expenses with converted values based on time lock-in

## Multichain Routes

### Get Available Chains

- *Method*: GET
- *URL*: /api/multichain/chains
- *Description*: Get all available blockchain networks for the user

### Get Available Tokens

- *Method*: GET
- *URL*: /api/multichain/tokens/:chainId
- *Description*: Get all available tokens for a specific blockchain network

### Get All Chains and Tokens

- *Method*: GET
- *URL*: /api/multichain/all-chains-tokens
- *Description*: Get all chains and their available tokens in one request

### Get User Chain Accounts

- *Method*: GET
- *URL*: /api/multichain/accounts
- *Description*: Get all blockchain accounts for the current user

### Add User Chain Account

- *Method*: POST
- *URL*: /api/multichain/accounts
- *Body*:
  json
  {
    "chainId": "ethereum",
    "address": "0x1234567890abcdef1234567890abcdef12345678",
    "isDefault": true
  }
  
- *Description*: Add a new blockchain account for the current user

### Create Multichain Settlement

- *Method*: POST
- *URL*: /api/multichain/settlements
- *Body*:
  json
  {
    "chainId": "ethereum",
    "tokenId": "eth",
    "groupId": "group-id-123",
    "transactions": [
      {
        "toUserId": "user-id-456",
        "amount": "0.01",
        "description": "Debt settlement for dinner"
      }
    ]
  }
  
- *Description*: Create a new multichain settlement transaction

### Submit Multichain Settlement

- *Method*: POST
- *URL*: /api/multichain/settlements/submit
- *Body*:
  json
  {
    "transactionId": "tx-id-123",
    "signedTx": "0x..."
  }
  
- *Description*: Submit a signed multichain settlement transaction

## Pricing Routes

### Get Price

- *Method*: GET
- *URL*: /api/pricing/price
- *Query Parameters*:
  - id (string): ID of the token/currency
  - baseCurrency (string): Base currency for price
- *Description*: Get the current price of a token or currency

### Get Prices

- *Method*: GET
- *URL*: /api/pricing/prices
- *Query Parameters*:
  - ids (string): Comma-separated list of token/currency IDs
  - baseCurrency (string): Base currency for prices
- *Description*: Get the prices of multiple tokens/currencies

### Get Historical Price

- *Method*: GET
- *URL*: /api/pricing/historical
- *Query Parameters*:
  - id (string): ID of the token/currency
  - baseCurrency (string): Base currency for price
  - date (string): Date for historical price (ISO format)
- *Description*: Get the historical price of a token/currency

### Get Exchange Rate

- *Method*: GET
- *URL*: /api/pricing/exchange-rate
- *Query Parameters*:
  - fromId (string): ID of the source token/currency
  - toId (string): ID of the target token/currency
- *Description*: Get exchange rate between two currencies/tokens

### Get Exchange Rate

Gets exchange rate between two currencies/tokens.

- **URL**: `/pricing/exchange-rate`
- **Method**: `GET`
- **Query Parameters**:
  - `fromId` (string): ID of the source token/currency
  - `toId` (string): ID of the target token/currency
- **Response**:
  ```json
  {
    "rate": 0.06
  }
  ```
