import {
  Page,
  Layout,
  Card,
  Button,
  Modal,
  ResourceList,
  ResourceItem,
  Text,
  BlockStack,
  InlineStack,
  EmptyState,
  Thumbnail,
  EmptySearchResult,
  Filters,
  ChoiceList,
} from "@shopify/polaris";
import { AppsIcon } from "@shopify/polaris-icons";
import { useState, useCallback, useEffect, useMemo } from "react";
import { useNavigate, useParams, useLoaderData } from "@remix-run/react";
import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";

// ---------------- LOADER ----------------
export async function loader({ request }) {
  const { admin } = await authenticate.admin(request);

  const query = `
    query fetchProducts($cursor: String) {
      products(first: 250, after: $cursor) {
        edges {
          cursor
          node {
            id
            title
            vendor
            productType
            tags
            featuredImage { url }
            collections(first: 5) {
              edges { node { id title } }
            }
          }
        }
        pageInfo {
          hasNextPage
          endCursor
        }
      }
    }
  `;

  let products = [];
  let cursor = null;
  let hasNextPage = true;

  // 👉 alle Produkte laden (Pagination)
  while (hasNextPage) {
    const response = await admin.graphql(query, { variables: { cursor } });
    const jsonResp = await response.json();

    const edges = jsonResp.data.products.edges;
    products.push(
      ...edges.map((edge) => ({
        id: edge.node.id.split("/").pop(),
        title: edge.node.title,
        vendor: edge.node.vendor,
        productType: edge.node.productType?.trim() || "Unbekannt",
        tags: edge.node.tags,
        featuredImage: edge.node.featuredImage?.url,
        collections: edge.node.collections.edges.map((c) => ({
          id: c.node.id.split("/").pop(),
          title: c.node.title,
        })),
      }))
    );

    hasNextPage = jsonResp.data.products.pageInfo.hasNextPage;
    cursor = jsonResp.data.products.pageInfo.endCursor;
  }

  // 👉 Filter-Optionen aufbereiten
  const vendors = [...new Set(products.map((p) => p.vendor).filter(Boolean))];
  const productTypes = [...new Set(products.map((p) => p.productType).filter(Boolean))];
  const tags = [...new Set(products.flatMap((p) => p.tags).filter(Boolean))];
  const collections = [
    ...new Map(
      products.flatMap((p) => p.collections).map((c) => [c.id, c])
    ).values(),
  ];

  return json({ products, vendors, productTypes, tags, collections });
}

// ---------------- MAIN PAGE ----------------
export default function RunFlowPage() {
  const { products, vendors, productTypes, tags, collections } = useLoaderData();
  const navigate = useNavigate();
  const { id } = useParams();

  const [flow, setFlow] = useState(null);
  const [selectedProductIds, setSelectedProductIds] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Flow aus localStorage laden
  useEffect(() => {
    try {
      const savedFlows = localStorage.getItem("flows");
      if (savedFlows) {
        const flows = JSON.parse(savedFlows);
        const currentFlow = flows.find((f) => String(f.id) === id);
        if (currentFlow) setFlow(currentFlow);
      }
    } catch (e) {
      console.error("Failed to load flow data", e);
    }
  }, [id]);

  // 👉 Produkte + Flow Infos in sessionStorage speichern
  const handleGenerateContent = useCallback(() => {
    const runId = Date.now();
    const runData = {
      runId,
      products: products.filter((p) => selectedProductIds.includes(p.id)),
      flow: {
        id: flow?.id,
        title: flow?.title,
        description: flow?.description,
        prompt: flow?.prompt || "Bitte generiere Content.",
        sourceFields: flow?.sourceFields || [],
        destinations: flow?.destinations || [],
      },
    };

    sessionStorage.setItem(`run-${runId}`, JSON.stringify(runData));
    navigate(`/app/runs/${runId}`);
  }, [navigate, products, selectedProductIds, flow]);

  return (
    <Page
      title={flow?.title ? `Run Flow: ${flow.title}` : "Run Contentflow"}
      backAction={{ content: "Back", onAction: () => navigate(-1) }}
    >
      <Layout>
        <Layout.Section>
          <BlockStack gap="400">
            {selectedProductIds.length === 0 ? (
              <EmptyState
                heading="Select products to get started"
                image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
              >
                <BlockStack gap="400" inlineAlign="center">
                  <Button icon={<AppsIcon />} onClick={() => setIsModalOpen(true)}>
                    Select Products
                  </Button>
                </BlockStack>
              </EmptyState>
            ) : (
              <BlockStack gap="400">
                <InlineStack gap="200" align="end">
                  <Button onClick={() => setIsModalOpen(true)}>Manage Products</Button>
                  <Button
                    onClick={handleGenerateContent}
                    disabled={selectedProductIds.length === 0}
                    style={{
                      backgroundColor: "#39ff14",
                      color: "#000",
                      fontWeight: "bold",
                    }}
                  >
                    Generate Content
                  </Button>
                </InlineStack>

                {/* Ausgewählte Produkte */}
                <Card>
                  <BlockStack spacing="400">
                    <ResourceList
                      resourceName={{ singular: "product", plural: "products" }}
                      items={products.filter((p) => selectedProductIds.includes(p.id))}
                      renderItem={({ id, title, featuredImage }) => (
                        <ResourceItem id={id}>
                          {featuredImage && <Thumbnail source={featuredImage} alt={title} />}
                          <Text variant="bodyMd" fontWeight="bold" as="h3">{title}</Text>
                        </ResourceItem>
                      )}
                    />
                  </BlockStack>
                </Card>
              </BlockStack>
            )}
          </BlockStack>
        </Layout.Section>
      </Layout>

      {/* Auswahl-Modal */}
      <ProductListModal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        products={products}
        vendors={vendors}
        productTypes={productTypes}
        tags={tags}
        collections={collections}
        selectedProductIds={selectedProductIds}
        setSelectedProductIds={setSelectedProductIds}
      />
    </Page>
  );
}

// ---------------- PRODUCT SELECTION MODAL ----------------
function ProductListModal({
  open,
  onClose,
  products,
  vendors,
  productTypes,
  tags,
  collections,
  selectedProductIds,
  setSelectedProductIds,
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedFilters, setSelectedFilters] = useState({
    vendor: [],
    productTypes: [],
    tags: [],
    collections: [],
  });

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchesSearch = p.title.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesVendor =
        selectedFilters.vendor.length > 0 ? selectedFilters.vendor.includes(p.vendor) : true;
      const matchesType =
        selectedFilters.productTypes.length > 0 ? selectedFilters.productTypes.includes(p.productType) : true;
      const matchesTag =
        selectedFilters.tags.length > 0 ? p.tags.some((t) => selectedFilters.tags.includes(t)) : true;
      const matchesCollection =
        selectedFilters.collections.length > 0
          ? p.collections.some((c) => selectedFilters.collections.includes(c.id))
          : true;
      return matchesSearch && matchesVendor && matchesType && matchesTag && matchesCollection;
    });
  }, [products, searchTerm, selectedFilters]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Produkte auswählen"
      large
      primaryAction={{
        content: `Auswählen (${selectedProductIds.length})`,
        onAction: onClose,
      }}
      secondaryActions={[{ content: "Abbrechen", onAction: onClose }]}
    >
      <Modal.Section>
        <BlockStack gap="400">
          <Filters
            queryValue={searchTerm}
            filters={[
              {
                key: "vendor",
                label: "Anbieter",
                filter: (
                  <ChoiceList
                    allowMultiple
                    title="Anbieter"
                    choices={vendors.map((v) => ({ label: v, value: v }))}
                    selected={selectedFilters.vendor}
                    onChange={(values) =>
                      setSelectedFilters((prev) => ({ ...prev, vendor: values }))
                    }
                  />
                ),
              },
              {
                key: "productTypes",
                label: "Kategorien",
                filter: (
                  <ChoiceList
                    allowMultiple
                    title="Kategorien"
                    choices={productTypes.map((t) => ({ label: t, value: t }))}
                    selected={selectedFilters.productTypes}
                    onChange={(values) =>
                      setSelectedFilters((prev) => ({ ...prev, productTypes: values }))
                    }
                  />
                ),
              },
              {
                key: "collections",
                label: "Kollektionen",
                filter: (
                  <ChoiceList
                    allowMultiple
                    title="Kollektionen"
                    choices={collections.map((c) => ({ label: c.title, value: c.id }))}
                    selected={selectedFilters.collections}
                    onChange={(values) =>
                      setSelectedFilters((prev) => ({ ...prev, collections: values }))
                    }
                  />
                ),
              },
              {
                key: "tags",
                label: "Tags",
                filter: (
                  <ChoiceList
                    allowMultiple
                    title="Tags"
                    choices={tags.map((t) => ({ label: t, value: t }))}
                    selected={selectedFilters.tags}
                    onChange={(values) =>
                      setSelectedFilters((prev) => ({ ...prev, tags: values }))
                    }
                  />
                ),
              },
            ]}
            onQueryChange={setSearchTerm}
            onQueryClear={() => setSearchTerm("")}
            onClearAll={() =>
              setSelectedFilters({ vendor: [], productTypes: [], tags: [], collections: [] })
            }
          />

          <div style={{ maxHeight: "400px", overflowY: "auto" }}>
            <ResourceList
              resourceName={{ singular: "product", plural: "products" }}
              items={filteredProducts}
              selectable
              selectedItems={selectedProductIds}
              onSelectionChange={setSelectedProductIds}
              renderItem={({ id, title, featuredImage }) => (
                <ResourceItem id={id}>
                  {featuredImage && <Thumbnail source={featuredImage} alt={title} />}
                  <Text variant="bodyMd" fontWeight="bold" as="h3">{title}</Text>
                </ResourceItem>
              )}
              emptyState={<EmptySearchResult title="Keine Produkte gefunden" />}
            />
          </div>
        </BlockStack>
      </Modal.Section>
    </Modal>
  );
}
