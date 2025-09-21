import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";

export async function action({ request }) {
  try {
    const { admin } = await authenticate.admin(request);
    const body = await request.json();
    const { product, destinations } = body;

    if (!product || !destinations) {
      return json({ error: "No product or destinations provided" }, { status: 400 });
    }

    // Mutations-Input
    const input = { id: `gid://shopify/Product/${product.id}` };

    if (destinations.includes("Product Title") && product.generatedTitle) {
      input.title = product.generatedTitle;
    }

    if (destinations.includes("Product Description") && product.generatedDescription) {
      // ✅ Zeilen in <p> umwandeln
      const htmlDescription = product.generatedDescription
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line.length > 0)
        .map((line) => `<p>${line}</p>`)
        .join("");

      input.descriptionHtml = htmlDescription;
    }

    if (destinations.includes("SEO Title") && product.generatedSeoTitle) {
      input.seo = { ...input.seo, title: product.generatedSeoTitle };
    }
    if (destinations.includes("SEO Description") && product.generatedSeoDescription) {
      input.seo = { ...input.seo, description: product.generatedSeoDescription };
    }

    const mutation = `
      mutation productUpdate($input: ProductInput!) {
        productUpdate(input: $input) {
          product {
            id
            title
            descriptionHtml
          }
          userErrors {
            field
            message
          }
        }
      }
    `;

    const response = await admin.graphql(mutation, { variables: { input } });
    const jsonResp = await response.json();

    if (jsonResp.data.productUpdate.userErrors.length > 0) {
      return json({ error: jsonResp.data.productUpdate.userErrors }, { status: 400 });
    }

    return json({ success: true, product: jsonResp.data.productUpdate.product });
  } catch (err) {
    console.error("❌ Apply error:", err);
    return json({ error: "Failed to apply changes." }, { status: 500 });
  }
}
