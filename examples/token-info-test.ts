import { TokenSDK } from 'warpgate-fun-sdk';

// Create a new instance of the TokenSDK
const tokenSDK = new TokenSDK({
  skipTransactionRecording: true, // Skip transaction recording for this test
});

async function testTokenFunctions() {
  try {
    console.log("Testing getTokenListings...");
    // Get the first page of token listings (9 per page)
    const listings = await tokenSDK.getTokenListings(9, 0);

    console.log(`Retrieved ${listings.length} token listings`);
    console.log("First token listing:", JSON.stringify(listings[0], null, 2));

    if (listings.length > 0) {
      // Get the token identifier from the first listing
      const tokenIdentifier = listings[0].mintAddr;

      console.log(`\nTesting getTokenInfo for token: ${tokenIdentifier}`);
      const tokenInfo = await tokenSDK.getTokenInfo(tokenIdentifier);

      console.log("Token info:", JSON.stringify(tokenInfo, null, 2));
    }

    console.log("\nTest completed successfully!");
  } catch (error) {
    console.error("Error during test:", error);
  }
}

// Run the test
testTokenFunctions();
