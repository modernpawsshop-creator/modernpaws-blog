export default async function handler(req, res) {
  try {
    const domain = process.env.SHOP_DOMAIN;
    const clientId = process.env.SHOPIFY_CLIENT_ID;
    const clientSecret = process.env.SHOPIFY_CLIENT_SECRET;
    const openAiKey = process.env.OPENAI_API_KEY;

    // 1. Fetch Shopify Access Token safely
    const tokenUrl = `https://${domain}/admin/oauth/access_token`;
    const tokenResponse = await fetch(tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "client_credentials",
        client_id: clientId,
        client_secret: clientSecret,
      })
    });

    const tokenText = await tokenResponse.text();
    let tokenData;
    try {
      tokenData = JSON.parse(tokenText);
    } catch (e) {
      return res.status(500).json({
        error: "Shopify OAuth endpoint did not return JSON",
        status: tokenResponse.status,
        responseText: tokenText.slice(0, 300)
      });
    }

    if (!tokenResponse.ok || !tokenData.access_token) {
      return res.status(500).json({ error: "Shopify token request rejected", details: tokenData });
    }
    const accessToken = tokenData.access_token;

    // 2. Call OpenAI safely
    const openaiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${openAiKey}`
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "You are an expert pet care SEO copywriter for ModernPaws. Return valid JSON containing 'title', 'body' (in HTML format), and 'summary'."
          },
          {
            role: "user",
            content: "Write an engaging, SEO-optimized pet care blog post for dog owners. Return only JSON with keys: title, body, summary."
          }
        ],
        response_format: { type: "json_object" }
      })
    });

    const openaiText = await openaiResponse.text();
    let openaiData;
    try {
      openaiData = JSON.parse(openaiText);
    } catch (e) {
      return res.status(500).json({
        error: "OpenAI API did not return JSON",
        status: openaiResponse.status,
        responseText: openaiText.slice(0, 300)
      });
    }

    if (!openaiResponse.ok) {
      return res.status(500).json({ error: "OpenAI API rejected request", details: openaiData });
    }

    const contentObj = JSON.parse(openaiData.choices[0].message.content);

    // 3. Push to Shopify GraphQL safely
    const graphqlUrl = `https://${domain}/admin/api/2026-10/graphql.json`;
    const shopifyResponse = await fetch(graphqlUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": accessToken
      },
      body: JSON.stringify({
        query: `
          mutation CreateArticle($article: ArticleCreateInput!) {
            articleCreate(article: $article) {
              article {
                id
                title
                handle
              }
              userErrors {
                field
                message
              }
            }
          }
        `,
        variables: {
          article: {
            blogId: "gid://shopify/Blog/126944772470",
            title: contentObj.title,
            body: contentObj.body,
            summary: contentObj.summary,
            author: { name: "ModernPaws" },
            isPublished: true
          }
        }
      })
    });

    const shopifyText = await shopifyResponse.text();
    let shopifyResult;
    try {
      shopifyResult = JSON.parse(shopifyText);
    } catch (e) {
      return res.status(500).json({
        error: "Shopify GraphQL endpoint did not return JSON",
        status: shopifyResponse.status,
        responseText: shopifyText.slice(0, 300)
      });
    }

    return res.status(200).json({
      success: true,
      article: shopifyResult
    });

  } catch (error) {
    return res.status(500).json({ error: error.message, stack: error.stack });
  }
}
