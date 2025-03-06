# Warpgate Token SDK

A comprehensive SDK for interacting with tokens on the Movement Network using a bonding curve mechanism. This SDK provides a simple interface for buying and selling tokens, fetching token information, and managing transactions.

[![npm version](https://img.shields.io/npm/v/warpgate-fun-sdk.svg)](https://www.npmjs.com/package/warpgate-fun-sdk)
[![GitHub](https://img.shields.io/github/license/hatchy-fun/warpgate-fun-sdk)](https://github.com/hatchy-fun/warpgate-fun-sdk/blob/main/LICENSE)

## Installation

```bash
npm install warpgate-fun-sdk
```

## Features

- Token buying and selling with price impact preview
- Transaction recording and history
- Authentication with wallet
- Simplified transaction execution
- Pool state monitoring
- Error handling and resilience

## Documentation

### Basic Usage

```typescript
import { TokenSDK } from "warpgate-fun-sdk";
import { Account } from "@aptos-labs/ts-sdk";

// Initialize SDK
const sdk = new TokenSDK();

// Use with a wallet account
// In a real application, this would come from a wallet provider like Petra or Martian
const account = yourWalletProvider.account;

// Authenticate with the API
const authToken = await sdk.authenticate(account);

// Get token information
const tokenIdentifier =
  "0x2d1479ec4dbbe6f45e068fb767e761f05fab2838954e0c6b8ea87e94ea089abb::NIGHTLY::NIGHTLY"; // Replace with your actual token identifier
const tokenInfo = await sdk.getTokenInfo(tokenIdentifier);
console.log(`Token: ${tokenInfo.name} (${tokenInfo.symbol})`);

// Preview a buy transaction
const aptAmount = 0.1; // Amount of APT to spend
const slippage = 5; // 5% slippage tolerance
const buyPreview = await sdk.previewBuy(tokenIdentifier, aptAmount, slippage);
console.log(
  `You will receive approximately ${buyPreview.outputAmount} ${tokenInfo.symbol}`
);

// Execute a buy transaction
const buyResult = await sdk.executeBuyTransaction(
  aptos, // Aptos client instance
  account,
  tokenIdentifier,
  aptAmount,
  slippage
);
console.log(`Buy transaction submitted: ${buyResult.txHash}`);
```

> **Note:** For testing purposes, you can create an account from a private key, but in production applications, always use a secure wallet provider:
>
> ```typescript
> // For testing only - in production use a wallet provider
> const privateKey = new Ed25519PrivateKey(process.env.PRIVATE_KEY); // Use environment variable
> const account = Account.fromPrivateKey({ privateKey });
> ```

### Initialization Options

```typescript
const sdk = new TokenSDK();
```

## Examples

### Fetching Token Listings

```typescript
// Get a list of available tokens
const tokenListings = await sdk.getTokenListings(10, 0); // Get first 10 tokens
console.log(`Found ${tokenListings.length} tokens`);

// Display token information
tokenListings.forEach((token, index) => {
  console.log(
    `${index + 1}. ${token.name} (${token.tickerSymbol}) - ${token.mintAddr}`
  );
});
```

### Previewing Transactions

```typescript
// Preview buying tokens with APT
const buyPreview = await sdk.previewBuy(
  tokenIdentifier,
  0.5, // 0.5 APT
  5 // 5% slippage
);
console.log(
  `Expected output: ${buyPreview.outputAmount} ${buyPreview.outputToken}`
);
console.log(`Price impact: ${buyPreview.priceImpact}%`);

// Preview selling tokens
const sellPreview = await sdk.previewSell(
  tokenIdentifier,
  10, // 10 tokens
  5 // 5% slippage
);
console.log(
  `Expected output: ${sellPreview.outputAmount} ${sellPreview.outputToken}`
);
console.log(`Price impact: ${sellPreview.priceImpact}%`);
```

### Complete Transaction Flow

```typescript
// Execute a complete buy transaction
const buyResult = await sdk.executeBuyTransaction(
  aptos,
  account,
  tokenIdentifier,
  0.1, // 0.1 APT
  5 // 5% slippage
);
console.log(`Buy transaction hash: ${buyResult.txHash}`);

// Wait for transaction confirmation
const confirmedTx = await sdk.waitForTransaction(aptos, buyResult.txHash);
console.log(
  `Transaction status: ${confirmedTx.success ? "Success" : "Failed"}`
);

// Execute a complete sell transaction
const sellResult = await sdk.executeSellTransaction(
  aptos,
  account,
  tokenIdentifier,
  5.0, // 5 tokens
  5 // 5% slippage
);
console.log(`Sell transaction hash: ${sellResult.txHash}`);
```

### Manual Transaction Flow

If you need more control over the transaction process, you can use the individual methods:

```typescript
// 1. Get buy parameters
const buyParams = await sdk.getBuyParameters({
  tokenIdentifier,
  amount: 0.1, // 0.1 APT
  slippage: 5,
});

// 2. Build and submit transaction (using Aptos SDK)
const buyTransaction = await aptos.transaction.build.simple({
  sender: account.accountAddress,
  data: buyParams,
});

const senderAuthenticator = aptos.transaction.sign({
  signer: account,
  transaction: buyTransaction,
});

const pendingBuyTx = await aptos.transaction.submit.simple({
  transaction: buyTransaction,
  senderAuthenticator,
});

// 3. Record transaction
const buyRecord = await sdk.recordBuyTransaction(
  pendingBuyTx.hash,
  tokenIdentifier
);
```

### Authentication

```typescript
// Complete authentication flow in one step
const authToken = await sdk.authenticate(account);

// Or manual authentication flow
const walletLoginResponse = await sdk.walletLogin(
  account.accountAddress.toString()
);
const fullMessage = `message: ${walletLoginResponse.message}\nnonce: ${walletLoginResponse.nonce}`;
const signature = await account.sign(Buffer.from(fullMessage));
const signatureHex = Buffer.from(signature.toUint8Array()).toString("hex");
const publicKeyHex = account.publicKey.toString();

const loginData = {
  walletAddr: account.accountAddress.toString(),
  publicKey: publicKeyHex,
  signature: signatureHex,
  fullMessage: fullMessage,
};

const authToken = await sdk.login(loginData);
```

> **Important:** Authentication is required before recording transactions. The SDK will throw a 401 error if you attempt to record a transaction without first authenticating. Use the `authenticate()` method or the manual authentication flow to obtain an auth token before calling `recordBuyTransaction()` or `recordSellTransaction()`. The simplified transaction methods (`executeBuyTransaction()` and `executeSellTransaction()`) will also fail to record transactions if not authenticated.

### Fetching Pool State

```typescript
// Get the current state of a token pool
const poolState = await sdk.fetchPoolState(tokenIdentifier);
console.log("Pool reserves:", poolState);
// Output: { reserve_x: 1000000, reserve_y: 50000 }
```

## Error Handling

The SDK includes robust error handling to ensure your application remains resilient:

```typescript
try {
  const buyResult = await sdk.executeBuyTransaction(
    aptos,
    account,
    tokenIdentifier,
    0.1,
    5
  );
  console.log(`Transaction submitted: ${buyResult.txHash}`);
} catch (error) {
  console.error(`Error executing transaction: ${error.message}`);
  // Handle the error appropriately
}
```

## API Reference

### TokenSDK Class

#### Constructor

```typescript
constructor(options: SDKOptions = {})
```

Options:

- `apiBaseUrl`: Custom API URL (default: 'https://api.warpgate.fun')
- `authToken`: Pre-existing auth token (optional)
- `skipTransactionRecording`: Set to true to skip transaction recording (default: false)

#### Authentication Methods

- `walletLogin(walletAddress: string): Promise<WalletLoginResponse>`
- `login(loginData: LoginDto): Promise<string>`
- `authenticate(account: any): Promise<string>`
- `setAuthToken(token: string): void`
- `getAuthToken(): string | null`
- `isAuthenticated(): boolean`

#### Token Information Methods

- `getTokenInfo(tokenIdentifier: string): Promise<TokenInfo>`
- `getTokenListings(limit: number = 50, offset: number = 0): Promise<TokenListing[]>`
- `fetchPoolState(tokenIdentifier: string): Promise<PoolState>`

#### Transaction Preview Methods

- `previewBuy(tokenIdentifier: string, aptAmount: number, slippage: number = 0): Promise<TradePreview>`
- `previewSell(tokenIdentifier: string, tokenAmount: number, slippage: number = 0): Promise<TradePreview>`

#### Transaction Parameter Methods

- `getBuyParameters(params: BuyParameters): Promise<InputGenerateTransactionPayloadData>`
- `getSellParameters(params: SellParameters): Promise<InputGenerateTransactionPayloadData>`

#### Transaction Recording Methods

- `recordBuyTransaction(txnHash: string, tokenIdentifier: string): Promise<TransactionRecord>`
- `recordSellTransaction(txnHash: string, tokenIdentifier: string): Promise<TransactionRecord>`

#### Simplified Transaction Methods

- `executeBuyTransaction(client: Aptos, account: any, tokenIdentifier: string, aptAmount: number, slippage: number = 5): Promise<{ txHash: string; record?: TransactionRecord }>`
- `executeSellTransaction(client: Aptos, account: any, tokenIdentifier: string, tokenAmount: number, slippage: number = 5): Promise<{ txHash: string; record?: TransactionRecord }>`

#### Utility Methods

- `waitForTransaction(client: Aptos, txHash: string, timeoutMs: number = 30000, checkIntervalMs: number = 1000): Promise<any>`
- `parseTokenIdentifier(tokenIdentifier: string): { address: string; ticker: string }`

## Example Projects

For complete working examples, see the example files in the SDK:

- [Simplified Usage Example](./examples/simplified-usage.ts) - Shows the complete workflow using simplified methods
- [Token Info Test](./examples/token-info-test.ts) - Demonstrates fetching token listings and information

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Links

- [NPM Package](https://www.npmjs.com/package/warpgate-fun-sdk)
- [GitHub Repository](https://github.com/hatchy-fun/warpgate-fun-sdk)
- [Issues](https://github.com/hatchy-fun/warpgate-fun-sdk/issues)
