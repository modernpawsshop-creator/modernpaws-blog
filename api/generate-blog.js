export default async function handler(req, res) {
  try {
    const tokenResponse = await fetch(`https://${process.env.SHOP_DOMAIN}/admin/oauth/access_token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "client_credentials",
        client_id: process.env.SHOPIFY_CLIENT_ID,
        client_secret: process.env.SHOPIFY_CLIENT_SECRET,
      })
    });
    
    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    if (!accessToken) {
      throw new Error("Failed to retrieve token from Shopify.");
    }

    const openaiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`
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

    const openaiData = await openaiResponse.json();
    const contentObj = JSON.parse(openaiData.choices[0].message.content);

    const shopifyResponse = await fetch(`https://${process.env.SHOP_DOMAIN}/admin/api/2026-10/graphql.json`, {
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
            isPublished: true
          }
        }
      })
    });

    const shopifyResult = await shopifyResponse.json();

    return res.status(200).json({
      success: true,
      article: shopifyResult.data.articleCreate.article
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message });
  }
}
