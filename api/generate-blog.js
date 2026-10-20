export default async function handler(req, res) {
  try {
    const domain = process.env.SHOP_DOMAIN;
    const clientId = process.env.SHOPIFY_CLIENT_ID;
    const clientSecret = process.env.SHOPIFY_CLIENT_SECRET;
    const openAiKey = process.env.OPENAI_API_KEY;

    // Return the exact state of everything right to the screen
    return res.status(200).json({
      status: "Debug inspection",
      SHOP_DOMAIN: domain || "UNDEFINED",
      SHOPIFY_CLIENT_ID: clientId ? "Present (Length: " + clientId.length + ")" : "MISSING",
      SHOPIFY_CLIENT_SECRET: clientSecret ? "Present (Length: " + clientSecret.length + ")" : "MISSING",
      OPENAI_API_KEY: openAiKey ? "Present (Length: " + openAiKey.length + ")" : "MISSING",
      testAuthUrl: `https://${domain}/admin/oauth/access_token`
    });

  } catch (error) {
    return res.status(500).json({ error: error.message, stack: error.stack });
  }
}
