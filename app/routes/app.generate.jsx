import { json } from "@remix-run/node";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// POST /app/generate
export async function action({ request }) {
  try {
    const body = await request.json();
    const { products, prompt, destinations = [] } = body;

    if (!products || products.length === 0) {
      return json({ error: "No products provided." }, { status: 400 });
    }

    const results = await Promise.all(
      products.map(async (product) => {
        try {
          console.log("⚡ Generating for product:", {
            id: product.id,
            title: product.title,
            destinations,
            image: product.featuredImage || "❌ no image",
          });

          // Content sources
          const sources = [];
          if (product.title) sources.push(`Product Title: ${product.title}`);
          if (product.vendor) sources.push(`Vendor: ${product.vendor}`);
          if (product.productType) sources.push(`Type: ${product.productType}`);

          // Build base user message
          const userMessage = {
            role: "user",
            content: [
              { type: "text", text: `${prompt}\n\n${sources.join("\n")}` },
              ...(product.featuredImage && destinations.includes("Product Description")
                ? [{ type: "image_url", image_url: { url: product.featuredImage } }]
                : []),
            ],
          };

          const completion = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            temperature: 0.4,
            max_tokens: 300,
            messages: [
              { role: "system", content: "You are a Shopify product content assistant." },
              userMessage,
            ],
          });

          const generated = completion.choices?.[0]?.message?.content?.trim() || null;

          // Ergebnis ins richtige Feld schreiben
          const result = { ...product, error: null };

          if (destinations.includes("Product Title")) {
            result.generatedTitle = generated;
          }
          if (destinations.includes("Product Description")) {
            result.generatedDescription = generated;
          }
          if (destinations.includes("SEO Title")) {
            result.generatedSeoTitle = generated;
          }
          if (destinations.includes("SEO Description")) {
            result.generatedSeoDescription = generated;
          }

          return result;
        } catch (err) {
          console.error("❌ Generation failed for product:", product.id, err);
          return { ...product, error: err.message };
        }
      })
    );

    return json({ results });
  } catch (error) {
    console.error("❌ Generation error:", error);
    return json({ error: "Failed to generate content." }, { status: 500 });
  }
}
