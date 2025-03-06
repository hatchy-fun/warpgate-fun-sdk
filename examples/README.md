# Token SDK Examples

This directory contains examples of how to use the Token SDK.

## Authentication Example

The `auth-example.ts` file demonstrates how to authenticate with the Token SDK using a wallet.

```typescript
// Initialize the SDK
const tokenSDK = new TokenSDK({
  apiBaseUrl: "https://api.warpgate.fun",
});

// Step 1: Get wallet login data
const walletLoginResponse = await tokenSDK.walletLogin(
  account.accountAddress.toString()
);

// Step 2: Sign the message with your wallet
const message = walletLoginResponse.message;
const nonce = walletLoginResponse.nonce;
const fullMessage = `${message}\n\nNonce: ${nonce}`;

// Sign the message using your wallet
const signatureBytes = account.sign(new TextEncoder().encode(fullMessage));
const signatureHex = Array.from(signatureBytes.toUint8Array())
  .map((byte) => byte.toString(16).padStart(2, "0"))
  .join("");

// Get public key as hex
const publicKeyHex =
  "0x" +
  Array.from(account.publicKey.toUint8Array())
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");

// Step 3: Complete login
const token = await tokenSDK.login({
  walletAddr: account.accountAddress.toString(),
  publicKey: publicKeyHex,
  signature: signatureHex,
  fullMessage: fullMessage,
});

// The SDK is now authenticated and the token will be included in API requests
```

## Record Transaction Example

The `record-transaction.ts` file demonstrates how to record a transaction using the Token SDK.

```typescript
// Initialize the SDK with authentication
const tokenSDK = new TokenSDK({
  apiBaseUrl: "https://api.warpgate.fun",
  authToken: "your_auth_token", // Get this from the login process
});

// Record a buy transaction
const buyRecord = await tokenSDK.recordBuyTransaction(
  "0x123...abc", // Transaction hash - replace with your actual transaction hash
  "0x2d1479ec4dbbe6f45e068fb767e761f05fab2838954e0c6b8ea87e94ea089abb::NIGHTLY::NIGHTLY" // Token identifier - replace with your actual token identifier
);

// Record a sell transaction
const sellRecord = await tokenSDK.recordSellTransaction(
  "0x456...def", // Transaction hash - replace with your actual transaction hash
  "0x2d1479ec4dbbe6f45e068fb767e761f05fab2838954e0c6b8ea87e94ea089abb::NIGHTLY::NIGHTLY" // Token identifier - replace with your actual token identifier
);
```

## Basic Usage Example

The `basic-usage.ts` file demonstrates basic usage of the Token SDK for trading.

```typescript
// Initialize the SDK
const tokenSDK = new TokenSDK();

// Preview a buy transaction
const buyPreview = await tokenSDK.previewBuy(
  "0xABC...XYZ::TOKEN::TOKEN", // Token identifier - replace with your actual token identifier
  "1000000" // Amount in smallest units (1 APT)
);

// Get buy transaction parameters
const buyParams = await tokenSDK.getBuyParameters(
  "0xABC...XYZ::TOKEN::TOKEN", // Token identifier - replace with your actual token identifier
  "1000000" // Amount in smallest units (1 APT)
);

// Preview a sell transaction
const sellPreview = await tokenSDK.previewSell(
  "0xABC...XYZ::TOKEN::TOKEN", // Token identifier - replace with your actual token identifier
  "1000000" // Amount of tokens to sell
);

// Get sell transaction parameters
const sellParams = await tokenSDK.getSellParameters(
  "0xABC...XYZ::TOKEN::TOKEN", // Token identifier - replace with your actual token identifier
  "1000000" // Amount of tokens to sell
);
```
