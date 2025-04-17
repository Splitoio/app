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
  ```

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
