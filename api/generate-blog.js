export default async function handler(req, res) {
  try {
    const domain = process.env.SHOP_DOMAIN;
    const clientId = process.env.SHOPIFY_CLIENT_ID;
    const clientSecret = process.env.SHOPIFY_CLIENT_SECRET;
    const openAiKey = process.env.OPENAI_API_KEY;

    // --- Step 1: Get Shopify Access Token ---
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
    const tokenData = JSON.parse(tokenText);
    if (!tokenResponse.ok || !tokenData.access_token) {
      return res.status(500).json({ error: "Shopify token request rejected", details: tokenData });
    }
    const accessToken = tokenData.access_token;

    // --- Step 2: Use OpenAI to generate blog content ---
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
    const openaiData = JSON.parse(openaiText);
    const contentObj = JSON.parse(openaiData.choices[0].message.content);

    // --- Step 3: Select a professional dog photo from Unsplash ---
    const dogImages = [
      "https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1537151608828-ea2b11777ee8?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1517849845537-4d257902454a?auto=format&fit=crop&w=1200&q=80"
    ];
    const selectedImageUrl = dogImages[Math.floor(Math.random() * dogImages.length)];

    // --- Step 4: Push to Shopify GraphQL with the featured image ---
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
                image {
                  url
                  altText
                }
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
            isPublished: true,
            image: {
              url: selectedImageUrl,
              altText: `Featured image for ${contentObj.title}`
            }
          }
        }
      })
    });
    const shopifyText = await shopifyResponse.text();
    const shopifyResult = JSON.parse(shopifyText);

    return res.status(200).json({
      success: true,
      article: shopifyResult
    });

  } catch (error) {
    return res.status(500).json({ error: error.message, stack: error.stack });
  }
}
