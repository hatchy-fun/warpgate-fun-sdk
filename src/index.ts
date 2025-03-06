import {
  Aptos,
  AptosConfig,
  Network,
  InputGenerateTransactionPayloadData,
} from "@aptos-labs/ts-sdk";
import axios from "axios";

// For Movement Network
export const config = new AptosConfig({
  network: Network.CUSTOM,
  fullnode: "https://mainnet.movementnetwork.xyz/v1",
  indexer: "https://indexer.mainnet.movementnetwork.xyz/v1/graphql",
});

export const aptos = new Aptos(config);

// Constants
export const BONDING_CURVE_ADDRESS =
  "0xfaef8b1d93ea1c296242e97b3b261ae03fe44d7580a2d261cb906eacffd56a52"; // Bonding curve contract address on Movement Network
export const API_BASE_URL = "https://api.warpgate.fun";

// Authentication Types
export interface WalletLoginResponse {
  message: string;
  nonce: string;
}

export interface LoginDto {
  walletAddr: string;
  publicKey: string;
  signature: string;
  fullMessage: string;
}

export interface LoginResponse {
  token: {
    token: string;
    expiresAt: string;
  };
}

// SDK Options
export interface SDKOptions {
  authToken?: string | null;
  skipTransactionRecording?: boolean;
}

// Pool State
export interface PoolState {
  reserve_x: number;
  reserve_y: number;
}

// Buy Parameters
export interface BuyParameters {
  tokenIdentifier: string; // In format "address::module::struct"
  amount: number;
  slippage: number;
  publicKey?: string;
}

// Sell Parameters
export interface SellParameters {
  tokenIdentifier: string; // In format "address::module::struct"
  tokenAmount: number;
  slippage: number;
  publicKey?: string;
}

// Transaction Types
export interface TransactionRecord {
  txnHash: string;
  tokenMintAddr: string;
  xAmt: string;
  yAmt: string;
  timestamp: string;
}

// Trade Preview
export interface TradePreview {
  inputAmount: number;
  outputAmount: number;
  inputToken: string;
  outputToken: string;
  slippage: number;
  priceImpact?: number;
}

// Token Information
export interface TokenInfo {
  name: string;
  symbol: string;
  decimals: number;
  supply: string;
  creator: string;
  tokenIdentifier: string;
  description?: string;
  image?: string;
  creatorName?: string;
}

// Token Listing
export interface TokenListing {
  id: string;
  name: string;
  tickerSymbol: string;
  mintAddr: string;
  desc: string;
  creator: string;
  creatorName: string;
  image: string;
  status: string;
  cdate: string;
}

export class TokenSDK {
  private nodeUrl: string;
  private apiBaseUrl: string;
  private authToken: string | null;
  private skipTransactionRecording: boolean;

  constructor(options: SDKOptions = {}) {
    this.nodeUrl = "https://fullnode.mainnet.aptoslabs.com/v1";
    this.apiBaseUrl = API_BASE_URL;
    this.authToken = options.authToken || null;
    this.skipTransactionRecording = options.skipTransactionRecording || false;
  }

  /**
   * Initiates the wallet login process
   * @param walletAddress The wallet address to login with
   * @returns The login challenge message and nonce
   */
  async walletLogin(walletAddress: string): Promise<WalletLoginResponse> {
    try {
      const response = await axios.post<WalletLoginResponse>(
        `${this.apiBaseUrl}/auth/wallet-login`,
        { walletAddr: walletAddress }
      );
      return response.data;
    } catch (error) {
      console.error("Error in wallet login:", error);
      throw new Error(
        `Failed to initiate wallet login: ${this.getErrorMessage(error)}`
      );
    }
  }

  /**
   * Completes the login process with a signed message
   * @param loginData The login data including wallet address, public key, signature and full message
   * @returns The authentication token
   */
  async login(loginData: LoginDto): Promise<string> {
    try {
      const response = await axios.post<LoginResponse>(
        `${this.apiBaseUrl}/auth/login`,
        loginData
      );
      this.authToken = response.data.token.token;
      return this.authToken;
    } catch (error) {
      console.error("Error in login:", error);
      throw new Error(
        `Failed to complete login: ${this.getErrorMessage(error)}`
      );
    }
  }

  /**
   * Sets the authentication token directly
   * @param token The authentication token
   */
  setAuthToken(token: string): void {
    this.authToken = token;
  }

  /**
   * Gets the current authentication token
   * @returns The current authentication token or null if not authenticated
   */
  getAuthToken(): string | null {
    return this.authToken;
  }

  /**
   * Checks if the SDK is authenticated
   * @returns True if authenticated, false otherwise
   */
  isAuthenticated(): boolean {
    return !!this.authToken;
  }

  /**
   * Helper method to extract error messages
   */
  private getErrorMessage(error: any): string {
    if (axios.isAxiosError(error)) {
      return `${error.message} (${error.response?.status || "unknown"})`;
    }
    return error.message || String(error);
  }

  /**
   * Parses a fully qualified token identifier into its components
   * @param tokenIdentifier Token identifier in format "address::module::struct"
   * @returns Object with address and ticker
   */
  private parseTokenIdentifier(tokenIdentifier: string): {
    address: string;
    ticker: string;
  } {
    const parts = tokenIdentifier.split("::");
    if (parts.length !== 3) {
      throw new Error(
        "Invalid token identifier format. Expected 'address::module::struct'"
      );
    }
    return {
      address: parts[0],
      ticker: parts[1], // Using the module name as ticker
    };
  }

  /**
   * Fetches the current state of a token pool
   * @param tokenIdentifier Token identifier in format "address::module::struct"
   * @returns Promise with pool state (reserve_x and reserve_y)
   */
  async fetchPoolState(tokenIdentifier: string): Promise<PoolState> {
    try {
      const { address, ticker } = this.parseTokenIdentifier(tokenIdentifier);
      const res = await aptos.getAccountResource({
        accountAddress: address,
        resourceType: `${BONDING_CURVE_ADDRESS}::interface::PoolState<${tokenIdentifier}>`,
      });
      return {
        reserve_x: Number(res.reserve_x),
        reserve_y: Number(res.reserve_y),
      };
    } catch (e: any) {
      throw new Error(`Failed to fetch pool state: ${e.message}`);
    }
  }

  /**
   * Fetches the current state of a token pool (legacy method)
   * @param address Creator address of the token
   * @param ticker Token ticker symbol
   * @returns Promise with pool state (reserve_x and reserve_y)
   * @deprecated Use fetchPoolState with tokenIdentifier instead
   */
  async fetchPoolStateByAddressAndTicker(
    address: string,
    ticker: string
  ): Promise<PoolState> {
    return this.fetchPoolState(
      `${address}::${ticker.toUpperCase()}::${ticker.toUpperCase()}`
    );
  }

  /**
   * Previews a buy transaction to show the user what they will receive
   * @param tokenIdentifier Token identifier in format "address::module::struct"
   * @param aptAmount Amount of APT to spend
   * @param slippage Slippage tolerance percentage
   * @returns Promise with trade preview information
   */
  async previewBuy(
    tokenIdentifier: string,
    aptAmount: number,
    slippage: number = 0
  ): Promise<TradePreview> {
    try {
      const { ticker } = this.parseTokenIdentifier(tokenIdentifier);

      // Fetch pool state
      const { reserve_x, reserve_y } = await this.fetchPoolState(
        tokenIdentifier
      );

      // Apply fee (1%)
      const adjustedAmount = (aptAmount * (10000 - 100)) / 10000;

      // Calculate expected token output
      const outputAmount =
        (adjustedAmount * reserve_x) /
        100_000_000 /
        (reserve_y / 100_000_000 + adjustedAmount);

      // Calculate price impact (simplified)
      const priceImpact = (aptAmount / (reserve_y / 100_000_000)) * 100;

      return {
        inputAmount: aptAmount,
        outputAmount,
        inputToken: "APT",
        outputToken: ticker,
        slippage,
        priceImpact: parseFloat(priceImpact.toFixed(2)),
      };
    } catch (e: any) {
      throw new Error(`Failed to preview buy: ${e.message}`);
    }
  }

  /**
   * Previews a buy transaction to show the user what they will receive (legacy method)
   * @param creatorAddress Creator address of the token
   * @param ticker Token ticker symbol
   * @param aptAmount Amount of APT to spend
   * @param slippage Slippage tolerance percentage
   * @returns Promise with trade preview information
   * @deprecated Use previewBuy with tokenIdentifier instead
   */
  async previewBuyByAddressAndTicker(
    creatorAddress: string,
    ticker: string,
    aptAmount: number,
    slippage: number = 0
  ): Promise<TradePreview> {
    return this.previewBuy(
      `${creatorAddress}::${ticker.toUpperCase()}::${ticker.toUpperCase()}`,
      aptAmount,
      slippage
    );
  }

  /**
   * Previews a sell transaction to show the user what they will receive
   * @param tokenIdentifier Token identifier in format "address::module::struct"
   * @param tokenAmount Amount of tokens to sell
   * @param slippage Slippage tolerance percentage
   * @returns Promise with trade preview information
   */
  async previewSell(
    tokenIdentifier: string,
    tokenAmount: number,
    slippage: number = 0
  ): Promise<TradePreview> {
    try {
      const { ticker } = this.parseTokenIdentifier(tokenIdentifier);

      // Fetch pool state
      const { reserve_x, reserve_y } = await this.fetchPoolState(
        tokenIdentifier
      );

      // Apply fee (1%)
      let derivedAmount =
        ((tokenAmount * reserve_y) /
          100_000_000 /
          (reserve_x / 100_000_000 + tokenAmount)) *
        0.99;

      // Calculate price impact (simplified)
      const priceImpact = (tokenAmount / (reserve_x / 100_000_000)) * 100;

      return {
        inputAmount: tokenAmount,
        outputAmount: derivedAmount,
        inputToken: ticker,
        outputToken: "APT",
        slippage,
        priceImpact: parseFloat(priceImpact.toFixed(2)),
      };
    } catch (e: any) {
      throw new Error(`Failed to preview sell: ${e.message}`);
    }
  }

  /**
   * Previews a sell transaction to show the user what they will receive (legacy method)
   * @param creatorAddress Creator address of the token
   * @param ticker Token ticker symbol
   * @param tokenAmount Amount of tokens to sell
   * @param slippage Slippage tolerance percentage
   * @returns Promise with trade preview information
   * @deprecated Use previewSell with tokenIdentifier instead
   */
  async previewSellByAddressAndTicker(
    creatorAddress: string,
    ticker: string,
    tokenAmount: number,
    slippage: number = 0
  ): Promise<TradePreview> {
    return this.previewSell(
      `${creatorAddress}::${ticker.toUpperCase()}::${ticker.toUpperCase()}`,
      tokenAmount,
      slippage
    );
  }

  /**
   * Generates parameters for a buy transaction
   * @param params Buy parameters
   * @returns Transaction payload for buying tokens
   */
  async getBuyParameters(
    params: BuyParameters
  ): Promise<InputGenerateTransactionPayloadData> {
    const { tokenIdentifier, amount, slippage } = params;

    // Fetch pool state to calculate expected outputs
    const { reserve_x, reserve_y } = await this.fetchPoolState(tokenIdentifier);

    // Calculate minimum token output based on slippage
    const derivedAmount =
      (amount * reserve_x) / 100_000_000 / (reserve_y / 100_000_000 + amount);
    const minTokenOut = (derivedAmount * (100 - slippage)) / 100;

    // Construct transaction payload
    return {
      function: `${BONDING_CURVE_ADDRESS}::bonding::buy`,
      typeArguments: [tokenIdentifier],
      functionArguments: [
        Math.floor(amount * 100_000_000),
        Math.floor(minTokenOut * 100_000_000),
      ],
    };
  }

  /**
   * Generates parameters for a sell transaction
   * @param params Sell parameters
   * @returns Transaction payload for selling tokens
   */
  async getSellParameters(
    params: SellParameters
  ): Promise<InputGenerateTransactionPayloadData> {
    const { tokenIdentifier, tokenAmount, slippage } = params;

    let minAptosOut = 0;
    // Make sure we're using an integer value for token amount
    const scaledTokenAmount = Math.floor(tokenAmount * 100_000_000);

    // Fetch pool state to calculate expected outputs
    const { reserve_x, reserve_y } = await this.fetchPoolState(tokenIdentifier);

    // Calculate minimum APT output based on slippage
    let derivedAmount = scaledTokenAmount * reserve_y;
    derivedAmount = parseFloat(
      (derivedAmount / (reserve_x + scaledTokenAmount)).toFixed(4)
    );
    minAptosOut = (derivedAmount * (100 - slippage)) / 100;

    // Construct transaction payload
    return {
      function: `${BONDING_CURVE_ADDRESS}::bonding::sell`,
      typeArguments: [tokenIdentifier],
      functionArguments: [scaledTokenAmount, 0],
    };
  }

  /**
   * Records a buy transaction in the database
   * @param txnHash Transaction hash
   * @param tokenIdentifier Token identifier in format "address::module::struct"
   * @returns Promise with the recorded transaction data
   */
  async recordBuyTransaction(
    txnHash: string,
    tokenIdentifier: string
  ): Promise<TransactionRecord> {
    console.log(
      `Recording buy transaction with hash: ${txnHash} for token: ${tokenIdentifier}`
    );

    if (this.skipTransactionRecording) {
      console.log("Transaction recording is disabled, skipping API call");
      return {
        txnHash,
        tokenMintAddr: tokenIdentifier,
        xAmt: "0",
        yAmt: "0",
        timestamp: Date.now().toString(),
      };
    }

    try {
      // Create a basic transaction record with the information we have
      let transactionRecord: TransactionRecord = {
        txnHash,
        tokenMintAddr: tokenIdentifier,
        xAmt: "0",
        yAmt: "0",
        timestamp: Date.now().toString(),
      };

      try {
        console.log("Waiting for transaction to be confirmed...");
        const committedTransaction: any = await aptos.waitForTransaction({
          transactionHash: txnHash,
        });

        console.log("Transaction confirmed, extracting event data...");
        const events = committedTransaction["events"] || [];
        console.log(`Found ${events.length} events in transaction`);

        // Find the swap event
        const swapEvent = events.find(
          (e: any) => e["type"].split("::")[2] === "SwappedEvent"
        );

        if (swapEvent) {
          console.log("Found swap event:", swapEvent);

          // Extract amounts from the event
          const { x_in, y_out } = swapEvent.data;

          // Convert amounts to human-readable format
          const xAmt = Number(y_out) / 100_000_000;
          const yAmt = Number(x_in) / 100_000_000;
          console.log(`Calculated amounts: xAmt=${xAmt}, yAmt=${yAmt}`);

          // Update transaction record with actual values
          transactionRecord = {
            txnHash: committedTransaction.hash,
            tokenMintAddr: tokenIdentifier,
            xAmt: xAmt.toString(),
            yAmt: yAmt.toString(),
            timestamp: new Date(Number(committedTransaction.timestamp) / 1_000)
              .getTime()
              .toString(),
          };
        } else {
          console.warn(
            "Swap event not found in transaction, using provided values"
          );
        }
      } catch (txError) {
        console.warn("Could not fetch transaction details:", txError);
        console.log("Proceeding with basic transaction record");
      }

      console.log("Created transaction record:", transactionRecord);

      // Send to API
      const apiUrl = `${this.apiBaseUrl}/transaction/buy-token`;
      console.log(`Sending data to API: ${apiUrl}`);

      // Include auth token if available
      const headers = this.authToken
        ? { Authorization: `Bearer ${this.authToken}` }
        : {};

      try {
        const response = await axios.post(apiUrl, transactionRecord, {
          headers,
        });
        console.log("API response:", response.data);
        return response.data;
      } catch (apiError: any) {
        console.error("API error:", {
          status: apiError.response?.status,
          statusText: apiError.response?.statusText,
          data: apiError.response?.data,
          url: apiError.config?.url,
          message: apiError.message,
        });

        if (apiError.response?.status === 401) {
          throw new Error(
            "API error: Authentication required. Please login first."
          );
        }

        throw new Error(
          `API error: ${apiError.message} (${
            apiError.response?.status || "unknown"
          })`
        );
      }
    } catch (error: any) {
      console.error("Error in recordBuyTransaction:", error);
      throw new Error(
        `Failed to record buy transaction: ${this.getErrorMessage(error)}`
      );
    }
  }

  /**
   * Records a buy transaction in the database (legacy method)
   * @param txnHash Transaction hash
   * @param creatorAddress Creator address of the token
   * @param ticker Token ticker symbol
   * @returns Promise with the recorded transaction data
   * @deprecated Use recordBuyTransaction with tokenIdentifier instead
   */
  async recordBuyTransactionByAddressAndTicker(
    txnHash: string,
    creatorAddress: string,
    ticker: string
  ): Promise<TransactionRecord> {
    return this.recordBuyTransaction(
      txnHash,
      `${creatorAddress}::${ticker.toUpperCase()}::${ticker.toUpperCase()}`
    );
  }

  /**
   * Records a sell transaction in the database
   * @param txnHash Transaction hash
   * @param tokenIdentifier Token identifier in format "address::module::struct"
   * @returns Promise with the recorded transaction data
   */
  async recordSellTransaction(
    txnHash: string,
    tokenIdentifier: string
  ): Promise<TransactionRecord> {
    console.log(
      `Recording sell transaction with hash: ${txnHash} for token: ${tokenIdentifier}`
    );

    if (this.skipTransactionRecording) {
      console.log("Transaction recording is disabled, skipping API call");
      return {
        txnHash,
        tokenMintAddr: tokenIdentifier,
        xAmt: "0",
        yAmt: "0",
        timestamp: Date.now().toString(),
      };
    }

    try {
      // Create a basic transaction record with the information we have
      let transactionRecord: TransactionRecord = {
        txnHash,
        tokenMintAddr: tokenIdentifier,
        xAmt: "0",
        yAmt: "0",
        timestamp: Date.now().toString(),
      };

      try {
        console.log("Waiting for transaction to be confirmed...");
        const committedTransaction: any = await aptos.waitForTransaction({
          transactionHash: txnHash,
        });

        console.log("Transaction confirmed, extracting event data...");
        const events = committedTransaction["events"] || [];
        console.log(`Found ${events.length} events in transaction`);

        // Find the swap event
        const swapEvent = events.find(
          (e: any) => e["type"].split("::")[2] === "SwappedEvent"
        );

        if (swapEvent) {
          console.log("Found swap event:", swapEvent);

          // Extract amounts from the event
          const { x_in, y_out } = swapEvent.data;

          // Convert amounts to human-readable format
          // For sell, we're selling tokens (x_in) and getting APT (y_out)
          const xAmt = Number(x_in) / 100_000_000;
          const yAmt = Number(y_out) / 100_000_000;
          console.log(`Calculated amounts: xAmt=${xAmt}, yAmt=${yAmt}`);

          // Update transaction record with actual values
          transactionRecord = {
            txnHash: committedTransaction.hash,
            tokenMintAddr: tokenIdentifier,
            xAmt: xAmt.toString(),
            yAmt: yAmt.toString(),
            timestamp: new Date(Number(committedTransaction.timestamp) / 1_000)
              .getTime()
              .toString(),
          };
        } else {
          console.warn(
            "Swap event not found in transaction, using provided values"
          );
        }
      } catch (txError) {
        console.warn("Could not fetch transaction details:", txError);
        console.log("Proceeding with basic transaction record");
      }

      console.log("Created transaction record:", transactionRecord);

      // Send to API
      const apiUrl = `${this.apiBaseUrl}/transaction/sell-token`;
      console.log(`Sending data to API: ${apiUrl}`);

      // Include auth token if available
      const headers = this.authToken
        ? { Authorization: `Bearer ${this.authToken}` }
        : {};

      try {
        const response = await axios.post(apiUrl, transactionRecord, {
          headers,
        });
        console.log("API response:", response.data);
        return response.data;
      } catch (apiError: any) {
        console.error("API error:", {
          status: apiError.response?.status,
          statusText: apiError.response?.statusText,
          data: apiError.response?.data,
          url: apiError.config?.url,
          message: apiError.message,
        });

        if (apiError.response?.status === 401) {
          throw new Error(
            "API error: Authentication required. Please login first."
          );
        }

        throw new Error(
          `API error: ${apiError.message} (${
            apiError.response?.status || "unknown"
          })`
        );
      }
    } catch (error: any) {
      console.error("Error in recordSellTransaction:", error);
      throw new Error(
        `Failed to record sell transaction: ${this.getErrorMessage(error)}`
      );
    }
  }

  /**
   * Records a sell transaction in the database (legacy method)
   * @param txnHash Transaction hash
   * @param creatorAddress Creator address of the token
   * @param ticker Token ticker symbol
   * @returns Promise with the recorded transaction data
   * @deprecated Use recordSellTransaction with tokenIdentifier instead
   */
  async recordSellTransactionByAddressAndTicker(
    txnHash: string,
    creatorAddress: string,
    ticker: string
  ): Promise<TransactionRecord> {
    return this.recordSellTransaction(
      txnHash,
      `${creatorAddress}::${ticker.toUpperCase()}::${ticker.toUpperCase()}`
    );
  }

  /**
   * Executes a complete buy transaction flow: generates parameters, builds, signs, submits, and records the transaction
   * @param client Aptos client instance
   * @param account Account to use for the transaction
   * @param tokenIdentifier Token identifier in format "address::module::struct"
   * @param aptAmount Amount of APT to spend
   * @param slippage Slippage tolerance percentage
   * @returns Promise with the transaction hash and recorded transaction data
   */
  async executeBuyTransaction(
    client: Aptos,
    account: any,
    tokenIdentifier: string,
    aptAmount: number,
    slippage: number = 5
  ): Promise<{ txHash: string; record?: TransactionRecord }> {
    try {
      // Check authentication
      if (!this.isAuthenticated()) {
        throw new Error("Authentication required. Please login first.");
      }

      // 1. Get buy parameters
      const buyParams = await this.getBuyParameters({
        tokenIdentifier,
        amount: aptAmount,
        slippage,
      });

      // 2. Build transaction
      const transaction = await client.transaction.build.simple({
        sender: account.accountAddress,
        data: buyParams,
      });

      // 3. Sign transaction
      const senderAuthenticator = client.transaction.sign({
        signer: account,
        transaction,
      });

      // 4. Submit transaction
      const pendingTx = await client.transaction.submit.simple({
        transaction,
        senderAuthenticator,
      });

      // 5. Record transaction (with error handling)
      let record: TransactionRecord | undefined;
      try {
        record = await this.recordBuyTransaction(
          pendingTx.hash,
          tokenIdentifier
        );
      } catch (recordError) {
        console.warn("Warning: Failed to record buy transaction:", recordError);
        // Continue without throwing an error, as the blockchain transaction was successful
      }

      return {
        txHash: pendingTx.hash,
        record,
      };
    } catch (error: any) {
      console.error("Error in executeBuyTransaction:", error);
      throw new Error(
        `Failed to execute buy transaction: ${this.getErrorMessage(error)}`
      );
    }
  }

  /**
   * Executes a complete sell transaction flow: generates parameters, builds, signs, submits, and records the transaction
   * @param client Aptos client instance
   * @param account Account to use for the transaction
   * @param tokenIdentifier Token identifier in format "address::module::struct"
   * @param tokenAmount Amount of tokens to sell
   * @param slippage Slippage tolerance percentage
   * @returns Promise with the transaction hash and recorded transaction data
   */
  async executeSellTransaction(
    client: Aptos,
    account: any,
    tokenIdentifier: string,
    tokenAmount: number,
    slippage: number = 5
  ): Promise<{ txHash: string; record?: TransactionRecord }> {
    try {
      // Check authentication
      if (!this.isAuthenticated()) {
        throw new Error("Authentication required. Please login first.");
      }

      // 1. Get sell parameters
      const sellParams = await this.getSellParameters({
        tokenIdentifier,
        tokenAmount,
        slippage,
      });

      // 2. Build transaction
      const transaction = await client.transaction.build.simple({
        sender: account.accountAddress,
        data: sellParams,
      });

      // 3. Sign transaction
      const senderAuthenticator = client.transaction.sign({
        signer: account,
        transaction,
      });

      // 4. Submit transaction
      const pendingTx = await client.transaction.submit.simple({
        transaction,
        senderAuthenticator,
      });

      // 5. Record transaction (with error handling)
      let record: TransactionRecord | undefined;
      try {
        record = await this.recordSellTransaction(
          pendingTx.hash,
          tokenIdentifier
        );
      } catch (recordError) {
        console.warn(
          "Warning: Failed to record sell transaction:",
          recordError
        );
        // Continue without throwing an error, as the blockchain transaction was successful
      }

      return {
        txHash: pendingTx.hash,
        record,
      };
    } catch (error: any) {
      console.error("Error in executeSellTransaction:", error);
      throw new Error(
        `Failed to execute sell transaction: ${this.getErrorMessage(error)}`
      );
    }
  }

  /**
   * Simplified authentication method that handles the entire authentication flow
   * @param account Account to authenticate with
   * @returns Promise with the authentication token
   */
  async authenticate(account: any): Promise<string> {
    try {
      // 1. Initiate wallet login
      const walletLoginResponse = await this.walletLogin(
        account.accountAddress.toString()
      );

      // 2. Create the full message to sign
      const fullMessage = `message: ${walletLoginResponse.message}\nnonce: ${walletLoginResponse.nonce}`;

      // 3. Sign the message
      const signature = await account.sign(Buffer.from(fullMessage));
      const signatureHex = Buffer.from(signature.toUint8Array()).toString(
        "hex"
      );
      const publicKeyHex = account.publicKey.toString();

      // 4. Complete login
      const loginData = {
        walletAddr: account.accountAddress.toString(),
        publicKey: publicKeyHex,
        signature: signatureHex,
        fullMessage: fullMessage,
      };

      // 5. Login and get token
      const authToken = await this.login(loginData);

      return authToken;
    } catch (error: any) {
      console.error("Error in authenticate:", error);
      throw new Error(`Authentication failed: ${this.getErrorMessage(error)}`);
    }
  }

  /**
   * Fetches detailed information about a token
   * @param tokenIdentifier Token identifier in format "address::module::struct"
   * @returns Promise with token information
   */
  async getTokenInfo(tokenIdentifier: string): Promise<TokenInfo> {
    try {
      try {
        const response = await axios.get(
          `${this.apiBaseUrl}/token/get-token/${tokenIdentifier}`
        );

        if (
          response.status === 200 &&
          response.data.ret === "0" &&
          response.data.tokenData
        ) {
          const data = response.data.tokenData;
          return {
            name: data.name || data.tickerSymbol,
            symbol: data.tickerSymbol,
            decimals: 8, // Default decimals
            supply: "0", // Supply not provided in this API
            creator: data.creator,
            tokenIdentifier: data.mintAddr,
            description: data.desc,
            image: data.image,
            creatorName: data.creatorName,
          };
        }
      } catch (apiError) {
        console.warn(`API call failed: ${this.getErrorMessage(apiError)}`);
        // Continue with default values if API call fails
      }

      // If API call fails or returns invalid data, use parsed token identifier for defaults
      const { address, ticker } = this.parseTokenIdentifier(tokenIdentifier);

      // Return default values if API call fails
      console.log(`Using default token info for ${tokenIdentifier}`);
      return {
        name: ticker,
        symbol: ticker,
        decimals: 8,
        supply: "0",
        creator: address,
        tokenIdentifier,
        description: "",
        image: "",
        creatorName: "",
      };
    } catch (error: any) {
      console.error("Error in getTokenInfo:", error);
      throw new Error(
        `Failed to fetch token info: ${this.getErrorMessage(error)}`
      );
    }
  }

  /**
   * Fetches a list of available tokens from the API
   * @param limit Maximum number of tokens to return
   * @param offset Offset for pagination
   * @returns Promise with token listings
   */
  async getTokenListings(
    limit: number = 50,
    offset: number = 0
  ): Promise<TokenListing[]> {
    try {
      // Use the correct endpoint for token listings
      const response = await axios.get(
        `${this.apiBaseUrl}/token/get-token-list?page=${
          Math.floor(offset / limit) + 1
        }&perPage=${limit}`
      );

      if (
        response.status === 200 &&
        response.data.ret === "0" &&
        response.data.paginatedResult?.results
      ) {
        return response.data.paginatedResult.results;
      }

      return [];
    } catch (error: any) {
      console.error("Error in getTokenListings:", error);
      // Return empty array instead of throwing error to make the API more resilient
      return [];
    }
  }

  /**
   * Waits for a transaction to be confirmed on the blockchain
   * @param client Aptos client instance
   * @param txHash Transaction hash to wait for
   * @param timeoutMs Maximum time to wait in milliseconds
   * @param checkIntervalMs Interval between checks in milliseconds
   * @returns Promise with transaction details
   */
  async waitForTransaction(
    client: Aptos,
    txHash: string,
    timeoutMs: number = 30000,
    checkIntervalMs: number = 1000
  ): Promise<any> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeoutMs) {
      try {
        // Use the getTransactionByHash method to get a specific transaction by hash
        const txn = await client.getTransactionByHash({
          transactionHash: txHash,
        });

        if (txn && txn.type === "user_transaction") {
          return txn;
        }
      } catch (error) {
        // Ignore errors and continue polling
      }

      // Wait for the next check interval
      await new Promise((resolve) => setTimeout(resolve, checkIntervalMs));
    }

    throw new Error(
      `Transaction ${txHash} was not confirmed within ${timeoutMs}ms timeout`
    );
  }
}
