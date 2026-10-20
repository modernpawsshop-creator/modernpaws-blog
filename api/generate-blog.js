export default async function handler(req, res) {
  try {
    // 1. Call OpenAI to generate the SEO blog post
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
    
    // Parse OpenAI's response
    const contentObj = JSON.parse(openaiData.choices[0].message.content);

    // 2. Push the article to Shopify via GraphQL
    const shopifyResponse = await fetch(`https://${process.env.SHOP_DOMAIN}/admin/api/2026-10/graphql.json`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": process.env.SHOPIFY_ACCESS_TOKEN
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
