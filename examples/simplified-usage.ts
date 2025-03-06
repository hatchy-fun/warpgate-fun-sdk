import { Account, Ed25519PrivateKey } from "@aptos-labs/ts-sdk";
import { TokenSDK, aptos } from "warpgate-fun-sdk";

// Example of using the simplified SDK methods
async function main() {
  try {
    console.log("Starting simplified SDK usage example...");

    // Initialize SDK
    const sdk = new TokenSDK();

    // Create account from private key (in a real app, this would be from a wallet)
    // IMPORTANT: Replace this with your own private key or use a wallet provider
    const privateKeyHex = process.env.PRIVATE_KEY;
    if (!privateKeyHex) {
      throw new Error("PRIVATE_KEY environment variable is required");
    }

    const privateKey = new Ed25519PrivateKey(privateKeyHex);
    const account = Account.fromPrivateKey({ privateKey });
    console.log(`Using account: ${account.accountAddress.toString()}`);

    // 1. Simplified Authentication - one call handles the entire flow
    console.log("Authenticating...");
    const authToken = await sdk.authenticate(account);
    console.log("Authentication successful!");

    // 2. Define token to interact with
    const tokenIdentifier =
      "0x2d1479ec4dbbe6f45e068fb767e761f05fab2838954e0c6b8ea87e94ea089abb::NIGHTLY::NIGHTLY";

    // 3. Get token information
    console.log(`Fetching token info for ${tokenIdentifier}...`);
    const tokenInfo = await sdk.getTokenInfo(tokenIdentifier);
    console.log("Token info:", tokenInfo);

    // 4. Fetch pool state
    console.log(`Fetching pool state for ${tokenIdentifier}...`);
    const poolState = await sdk.fetchPoolState(tokenIdentifier);
    console.log("Pool state:", poolState);

    // 5. Preview buy transaction
    const aptAmount = 0.0001; // Amount of APT to spend
    const slippage = 25; // 5% slippage

    console.log(
      `Previewing buy of ${tokenIdentifier} with ${aptAmount} APT...`
    );
    const buyPreview = await sdk.previewBuy(
      tokenIdentifier,
      aptAmount,
      slippage
    );
    console.log("Buy preview:", buyPreview);

    // Get token listings
    console.log("\nFetching token listings...");
    try {
      const listings = await sdk.getTokenListings(5, 0); // Get first 5 tokens
      console.log(`Found ${listings.length} tokens:`);
      listings.forEach((token, index) => {
        console.log(
          `${index + 1}. ${token.name} (${token.tickerSymbol}) - ${
            token.mintAddr
          }`
        );
      });
    } catch (error: any) {
      console.log("Could not fetch token listings:", error.message || error);
    }

    // Check if the account exists on the blockchain before executing transactions
    try {
      // Try to get account info to see if it exists
      await aptos.getAccountInfo({ accountAddress: account.accountAddress });

      // 6. Execute buy transaction (complete flow in one call)
      console.log("Executing buy transaction...");
      const buyResult = await sdk.executeBuyTransaction(
        aptos,
        account,
        tokenIdentifier,
        aptAmount,
        slippage
      );
      console.log(`Buy transaction submitted with hash: ${buyResult.txHash}`);

      // Log transaction record if available
      if (buyResult.record) {
        console.log("Transaction recorded successfully:", buyResult.record);
      } else {
        console.log("Transaction submitted but recording may have failed");
      }

      // 7. Wait for transaction confirmation
      console.log("Waiting for transaction confirmation...");
      const confirmedTx = await sdk.waitForTransaction(aptos, buyResult.txHash);
      console.log(
        "Transaction confirmed:",
        confirmedTx.success ? "Success" : "Failed"
      );

      // 8. Preview sell transaction
      const tokenAmount = buyPreview.outputAmount / 2; // Sell half of what we bought

      console.log(`Previewing sell of ${tokenAmount} ${tokenInfo.symbol}...`);
      const sellPreview = await sdk.previewSell(
        tokenIdentifier,
        tokenAmount,
        slippage
      );
      console.log("Sell preview:", sellPreview);

      // 9. Execute sell transaction (complete flow in one call)
      console.log("Executing sell transaction...");
      const sellResult = await sdk.executeSellTransaction(
        aptos,
        account,
        tokenIdentifier,
        tokenAmount,
        slippage
      );
      console.log(`Sell transaction submitted with hash: ${sellResult.txHash}`);

      // Log transaction record if available
      if (sellResult.record) {
        console.log("Transaction recorded successfully:", sellResult.record);
      } else {
        console.log("Transaction submitted but recording may have failed");
      }

      // 10. Wait for transaction confirmation
      console.log("Waiting for transaction confirmation...");
      const confirmedSellTx = await sdk.waitForTransaction(
        aptos,
        sellResult.txHash
      );
      console.log(
        "Transaction confirmed:",
        confirmedSellTx.success ? "Success" : "Failed"
      );
    } catch (accountError) {
      console.log(
        "Account not found on blockchain or insufficient funds. Skipping transaction execution."
      );
      console.log(
        "In a real application, you would need to fund this account first."
      );
      console.log(
        "For demonstration purposes, we'll skip the transaction execution steps."
      );

      // Show what would happen next in a real scenario
      console.log("\nIn a real scenario with a funded account, you would:");
      console.log(
        `1. Buy ${buyPreview.outputAmount} ${tokenInfo.symbol} for ${aptAmount} APT`
      );
      console.log(`2. Sell some ${tokenInfo.symbol} tokens back for APT`);
      console.log(`3. Record these transactions in the database`);
    }

    console.log("\nExample completed successfully!");
  } catch (error) {
    console.error("Error in example:", error);
  }
}

main();
