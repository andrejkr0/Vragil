import {
  Page,
  Layout,
  Card,
  TextField,
  RadioButton,
  Text,
  BlockStack,
  Autocomplete,
  Icon,
  Tag,
  InlineStack,
  LegacyCard,
  Toast,
} from "@shopify/polaris";
import { SearchIcon } from "@shopify/polaris-icons";
import { useState, useCallback, useEffect, useMemo } from "react";
import { useNavigate, useSearchParams } from "@remix-run/react";
import { v4 as uuidv4 } from "uuid";

// Statische Daten für die Templates
const templates = [
  {
    id: "careInstructions",
    title: "Product Care Instructions",
    description: "Create product care instructions based on attributes.",
    presetFields: {
      sourceFields: ["Product Description"],
      destinations: ["Product Description"],
      prompt: "Create product care instructions based on the product's attributes.",
    },
  },
  {
    id: "altText",
    title: "Product Image Alt Text",
    description: "Generate SEO optimized image alt texts.",
    presetFields: {
      sourceFields: ["Images"],
      destinations: ["Alt Text (Images)"],
      prompt: "Generate SEO optimized image alt texts for the provided product images.",
    },
  },
  {
    id: "seoDescription",
    title: "Generate SEO Description",
    description: "Generate a SEO optimized product description from product title and description.",
    presetFields: {
      sourceFields: ["Product Title", "Product Description"],
      destinations: ["SEO Description"],
      prompt: "Generate a SEO optimized product description from the given title and description.",
    },
  },
  {
    id: "seoTitle",
    title: "Generate SEO Title",
    description: "Generate a SEO optimized product title from product title and description.",
    presetFields: {
      sourceFields: ["Product Title", "Product Description"],
      destinations: ["SEO Title"],
      prompt: "Generate a SEO optimized product title from the given title and description.",
    },
  },
  {
    id: "tagsFromImages",
    title: "Generate Tags Based on Product Images",
    description: "Generate tags used for filtering or categorization.",
    presetFields: {
      sourceFields: ["Images"],
      destinations: ["Tags"],
      prompt: "Generate relevant product tags based on the provided product images.",
    },
  },
  {
    id: "titleFromImages",
    title: "Product Title Based on Product Images",
    description: "Generate a product title based on product images.",
    presetFields: {
      sourceFields: ["Images"],
      destinations: ["Product Title"],
      prompt: "Generate a compelling product title based on the provided product images.",
    },
  },
  {
    id: "descriptionFromImage",
    title: "Description from Image",
    description: "Create a product description from your image.",
    presetFields: {
      sourceFields: ["Images"],
      destinations: ["Product Description"],
      prompt: "Create a detailed product description from your product image.",
    },
  },
];

export default function CreateFlowPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preset = searchParams.get("preset");
  const editId = searchParams.get("edit");

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selectionType, setSelectionType] = useState("products");
  const [sourceFields, setSourceFields] = useState([]);
  const [sourceInput, setSourceInput] = useState("");
  const [destinations, setDestinations] = useState([]);
  const [destInput, setDestInput] = useState("");
  const [prompt, setPrompt] = useState("");
  const [toastActive, setToastActive] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [toastError, setToastError] = useState(false);

  // Memoized lists for Autocomplete options
  const sourceOptions = useMemo(() => {
    return [
      "Product Title",
      "Product Description",
      "SEO Title",
      "SEO Description",
      "Vendor",
      "Tags",
      "Min Variant Price",
      "Max Variant Price",
      "Options",
      "Total Inventory",
      "Images",
      "Metafield",
    ].map((label) => ({ value: label, label }));
  }, []);

  const destinationOptions = useMemo(() => {
    return [
      "Product Title",
      "Product Description",
      "SEO Title",
      "SEO Description",
      "Tags",
      "Alt Text (Images)",
      "Metafields",
    ].map((label) => ({ value: label, label }));
  }, []);

  // Effect to load data on mount or when URL params change
  useEffect(() => {
    try {
      if (editId) {
        const saved = localStorage.getItem("flows");
        if (saved) {
          const flows = JSON.parse(saved);
          const flow = flows.find((f) => String(f.id) === editId);
          if (flow) {
            setTitle(flow.title || "");
            setDescription(flow.description || "");
            setSelectionType(flow.selectionType || "products");
            setSourceFields(flow.sourceFields || []);
            setDestinations(flow.destinations || []);
            setPrompt(flow.prompt || "");
          }
        }
      } else if (preset) {
        const template = templates.find((t) => t.id === preset);
        if (template) {
          setTitle(template.title);
          setDescription(template.description);
          setSelectionType(template.selectionType || "products");
          setSourceFields(template.presetFields.sourceFields || []);
          setDestinations(template.presetFields.destinations || []);
          setPrompt(template.presetFields.prompt || "");
        }
      }
    } catch (e) {
      console.error("Failed to load data from localStorage", e);
      setToastMessage("Failed to load data from local storage.");
      setToastError(true);
      setToastActive(true);
    }
  }, [editId, preset]);

  // Handler for saving the flow
  const handleSave = useCallback(() => {
    // Basic validation
    if (sourceFields.length === 0 || destinations.length === 0) {
      setToastMessage("Please select at least one source and one destination field.");
      setToastError(true);
      setToastActive(true);
      return;
    }

    let flows = [];
    try {
      const saved = localStorage.getItem("flows");
      if (saved) {
        flows = JSON.parse(saved);
      }

      if (editId) {
        // Update existing flow
        flows = flows.map((f) =>
          String(f.id) === editId
            ? {
                ...f,
                title,
                description,
                selectionType,
                sourceFields,
                destinations,
                prompt,
              }
            : f
        );
      } else {
        // Create new flow
        const newFlowData = {
          id: uuidv4(),
          title: title || (preset && templates.find((t) => t.id === preset)?.title) || "Untitled Flow",
          description: description || (preset && templates.find((t) => t.id === preset)?.description) || "No description",
          selectionType,
          sourceFields,
          destinations,
          prompt,
        };
        flows.push(newFlowData);
      }
      localStorage.setItem("flows", JSON.stringify(flows));
      setToastMessage("Flow successfully saved!");
      setToastError(false);
      setToastActive(true);
      navigate("/app");
    } catch (e) {
      console.error("Failed to save flow to localStorage", e);
      setToastMessage("Failed to save flow. Please try again.");
      setToastError(true);
      setToastActive(true);
    }
  }, [title, description, selectionType, sourceFields, destinations, prompt, editId, navigate, preset]);

  // Autocomplete and Tag management
  const updateSourceInput = useCallback((value) => setSourceInput(value), []);
  const updateSourceSelection = useCallback(
    (selected) => {
      const value = selected[0];
      if (value && !sourceFields.includes(value)) {
        setSourceFields((currentFields) => [...currentFields, value]);
      }
      setSourceInput("");
    },
    [sourceFields]
  );
  const removeSourceTag = useCallback(
    (tag) => () => setSourceFields((currentFields) => currentFields.filter((t) => t !== tag)),
    []
  );

  const updateDestInput = useCallback((value) => setDestInput(value), []);
  const updateDestSelection = useCallback(
    (selected) => {
      const value = selected[0];
      if (value && !destinations.includes(value)) {
        setDestinations((currentDest) => [...currentDest, value]);
      }
      setDestInput("");
    },
    [destinations]
  );
  const removeDestTag = useCallback(
    (tag) => () => setDestinations((currentDest) => currentDest.filter((t) => t !== tag)),
    []
  );

  // Autocomplete text field components
  const sourceTextField = (
    <Autocomplete.TextField
      onChange={updateSourceInput}
      label="Choose the product fields that should be available to the AI."
      value={sourceInput}
      prefix={<Icon source={SearchIcon} />}
      placeholder="Search..."
      autoComplete="off"
    />
  );
  const destTextField = (
    <Autocomplete.TextField
      onChange={updateDestInput}
      label="Select where to save the generated content."
      value={destInput}
      prefix={<Icon source={SearchIcon} />}
      placeholder="Search..."
      autoComplete="off"
    />
  );

  return (
    <Page
      title={editId ? "Edit Flow" : "Create Flow"}
      backAction={{ content: "Back", onAction: () => navigate("/app") }}
      primaryAction={{ content: "Save", onAction: handleSave }}
    >
      <Layout>
        <Layout.Section>
          <BlockStack gap="400">
            {/* Title + Description Card */}
            <Card>
              <BlockStack gap="400">
                <TextField
                  label="Title"
                  value={title}
                  onChange={setTitle}
                  placeholder="Enter flow title"
                />
                <TextField
                  label="Description"
                  value={description}
                  onChange={setDescription}
                  multiline={3}
                  placeholder="Add a short description"
                  helpText="Add a brief description to help you identify the purpose of this flow."
                />
              </BlockStack>
            </Card>

            {/* Selection Type Card */}
            <Card>
              <BlockStack gap="300">
                <Text variant="headingLg" as="h3">
                  Selection Type
                </Text>
                <RadioButton
                  label="Products"
                  checked={selectionType === "products"}
                  id="products"
                  name="selectionType"
                  onChange={() => setSelectionType("products")}
                  helpText="Generate content for products, such as product descriptions or product tags."
                />
                <RadioButton
                  label="Product Images"
                  checked={selectionType === "images"}
                  id="images"
                  name="selectionType"
                  onChange={() => setSelectionType("images")}
                  helpText="Generate Alt texts for products images."
                />
              </BlockStack>
            </Card>

            {/* Source Fields Card */}
            <Card title="Source fields">
              <LegacyCard sectioned>
                <BlockStack gap="300">
                  <InlineStack gap="200" wrap>
                    {sourceFields.map((field) => (
                      <Tag key={field} onRemove={removeSourceTag(field)}>
                        {field}
                      </Tag>
                    ))}
                  </InlineStack>
                  <Autocomplete
                    options={sourceOptions}
                    selected={sourceFields}
                    textField={sourceTextField}
                    onSelect={updateSourceSelection}
                  />
                </BlockStack>
              </LegacyCard>
            </Card>

            {/* Instructions + Destination Card */}
            <Card title="Instructions">
              <BlockStack gap="400">
                <TextField
                  label="Prompt"
                  value={prompt}
                  onChange={setPrompt}
                  multiline={5}
                  placeholder="Create a product description based on..."
                />
                <LegacyCard sectioned>
                  <BlockStack gap="300">
                    <Text variant="headingSm" as="h4">
                      Destination
                    </Text>
                    <InlineStack gap="200" wrap>
                      {destinations.map((dest) => (
                        <Tag key={dest} onRemove={removeDestTag(dest)}>
                          {dest}
                        </Tag>
                      ))}
                    </InlineStack>
                    <Autocomplete
                      options={destinationOptions}
                      selected={destinations}
                      textField={destTextField}
                      onSelect={updateDestSelection}
                    />
                  </BlockStack>
                </LegacyCard>
              </BlockStack>
            </Card>
          </BlockStack>
        </Layout.Section>
      </Layout>
      {toastActive && (
        <Toast
          content={toastMessage}
          error={toastError}
          onDismiss={() => setToastActive(false)}
        />
      )}
    </Page>
  );
}