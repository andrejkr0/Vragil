import {
  Page,
  Layout,
  Card,
  Text,
  BlockStack,
  InlineStack,
  Spinner,
  ResourceList,
  Thumbnail,
  Modal,
  TextField,
} from "@shopify/polaris";
import { useLoaderData } from "@remix-run/react";
import { json } from "@remix-run/node";
import { useEffect, useState } from "react";

// ---------------- LOADER ----------------
export async function loader({ params }) {
  return json({ runId: params.runId });
}

// ---------------- COMPONENT ----------------
export default function RunStatusPage() {
  const { runId } = useLoaderData();

  const [products, setProducts] = useState([]);
  const [completed, setCompleted] = useState(0);
  const [status, setStatus] = useState("running");
  const [modalProduct, setModalProduct] = useState(null);
  const [destinations, setDestinations] = useState([]);

  // Generierung starten
  useEffect(() => {
    const saved = sessionStorage.getItem(`run-${runId}`);
    if (!saved) return;

    const parsed = JSON.parse(saved);
    setProducts(parsed.products || []);
    setDestinations(parsed.flow?.destinations || []); // 👈 Save destinations

    async function generate() {
      try {
        const res = await fetch("/app/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            products: parsed.products,
            prompt: parsed.flow?.prompt || "Generate SEO content.",
            sources: parsed.flow?.sources || [],
            destinations: parsed.flow?.destinations || [],
          }),
        });

        const data = await res.json();
        if (data.results) {
          setProducts(
            data.results.map((r) => ({
              ...r,
              status: r.error ? "failed" : "not-applied",
            }))
          );
          setCompleted(data.results.filter((r) => !r.error).length);
          setStatus("completed");
        }
      } catch (err) {
        console.error("Error generating:", err);
        setStatus("completed");
      }
    }

    if (status === "running") {
      generate();
    }
  }, [runId]);

  // Apply einzelnes Produkt
  const handleApply = async (product) => {
    try {
      await fetch("/app/apply-single", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          product,
          destinations, // 👈 jetzt mitgeschickt
        }),
      });

      setProducts((prev) =>
        prev.map((p) =>
          p.id === product.id ? { ...p, status: "applied" } : p
        )
      );
    } catch (err) {
      console.error("Apply error:", err);
    } finally {
      setModalProduct(null);
    }
  };

  // Apply alle Produkte
  const handleApplyAll = async () => {
    try {
      await fetch("/app/apply-all", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          products,
          destinations, // 👈 jetzt auch hier
        }),
      });

      setProducts((prev) =>
        prev.map((p) =>
          p.status === "not-applied" ? { ...p, status: "applied" } : p
        )
      );
    } catch (err) {
      console.error("ApplyAll error:", err);
    }
  };

  // Hintergrundfarbe je nach Status
  const getBackgroundColor = (p) => {
    if (status === "running") return "#f4f6f8";
    if (p.status === "not-applied") return "#ffffff";
    if (p.status === "applied") return "#d4f8d4";
    if (p.status === "failed") return "#ffe0e0";
    return "#ffffff";
  };

  return (
    <Page title={`Contentflow Run #${runId}`}>
      <Layout>
        {/* Status */}
        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <InlineStack gap="200" blockAlign="center">
                {status === "running" && <Spinner size="small" />}
                <Text>
                  {status === "running"
                    ? `Generating content… ${completed} out of ${products.length} Products completed so far.`
                    : `Completed ${products.length} of ${products.length} products.`}
                </Text>
              </InlineStack>
              {status === "completed" && products.length > 0 && (
                <button
                  style={{
                    background: "#2ecc71",
                    color: "white",
                    padding: "10px 20px",
                    borderRadius: "6px",
                    fontWeight: "bold",
                    border: "none",
                  }}
                  onClick={handleApplyAll}
                >
                  Apply All
                </button>
              )}
            </BlockStack>
          </Card>
        </Layout.Section>

        {/* Product Cards */}
        <Layout.Section>
          <Card>
            <ResourceList
              resourceName={{ singular: "product", plural: "products" }}
              items={products}
              renderItem={(product) => (
                <div
                  style={{
                    background: getBackgroundColor(product),
                    borderRadius: "8px",
                    marginBottom: "10px",
                    padding: "15px",
                    cursor: "pointer",
                  }}
                  onClick={() => setModalProduct(product)}
                >
                  <InlineStack align="space-between" blockAlign="center">
                    {/* Thumbnail + Titel nebeneinander */}
                    <InlineStack gap="200" blockAlign="center">
                      {product.featuredImage && (
                        <Thumbnail
                          source={product.featuredImage}
                          alt={product.title}
                          size="small" // 👈 kleines Bild links
                        />
                      )}
                      <Text variant="bodyMd" fontWeight="bold" as="h3">
                        {product.generatedTitle || product.title}
                      </Text>
                    </InlineStack>

                    <Text variant="bodySm" tone="subdued">
                      {product.status === "applied"
                        ? "Applied"
                        : product.status === "not-applied"
                        ? "Not Applied"
                        : product.status === "failed"
                        ? "Failed"
                        : "Generating..."}
                    </Text>
                  </InlineStack>

                  {product.generatedDescription && (
                    <Text tone="subdued" variant="bodySm" truncate>
                      {product.generatedDescription}
                    </Text>
                  )}
                </div>
              )}
            />
          </Card>
        </Layout.Section>
      </Layout>

      {/* Modal für Description */}
      {modalProduct?.generatedDescription && (
        <Modal
          open
          onClose={() => setModalProduct(null)}
          title={modalProduct.title}
          large
          primaryAction={{
            content: "Apply Changes",
            onAction: () => handleApply(modalProduct),
          }}
          secondaryActions={[
            { content: "Skip", onAction: () => setModalProduct(null) },
          ]}
        >
          <Modal.Section>
            <BlockStack gap="400">
              <Card title="Original Description">
                <TextField
                  value={modalProduct.description || ""}
                  multiline
                  readOnly
                />
              </Card>
              <Card title="New Description">
                <TextField
                  value={modalProduct.generatedDescription || ""}
                  multiline
                  onChange={(val) =>
                    setModalProduct((prev) => ({
                      ...prev,
                      generatedDescription: val,
                    }))
                  }
                />
              </Card>
            </BlockStack>
          </Modal.Section>
        </Modal>
      )}
    </Page>
  );
}
