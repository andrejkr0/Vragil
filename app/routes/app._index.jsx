import {
  Page,
  Layout,
  Card,
  Text,
  Button,
  BlockStack,
  InlineStack,
  Icon,
} from "@shopify/polaris";
import { EditIcon, DeleteIcon, ArrowRightIcon } from "@shopify/polaris-icons";
import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "@remix-run/react";

export default function HomePage() {
  const [flows, setFlows] = useState([]);
  const navigate = useNavigate();

  // Flows laden aus localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem("flows");
      if (saved) {
        setFlows(JSON.parse(saved));
      }
    } catch (e) {
      console.error("Failed to load flows from localStorage", e);
      localStorage.removeItem("flows");
    }
  }, []);

  // Flow löschen
  const handleDelete = useCallback(
    (id) => {
      const updated = flows.filter((flow) => flow.id !== id);
      setFlows(updated);
      localStorage.setItem("flows", JSON.stringify(updated));
    },
    [flows]
  );

  // Flow bearbeiten
  const handleEdit = useCallback(
    (id) => {
      navigate(`/app/flows/create?edit=${id}`);
    },
    [navigate]
  );

  // Flow starten (Run)
  const handleRun = useCallback(
    (id) => {
      navigate(`/app/flows/${id}/run`);
    },
    [navigate]
  );

  return (
    <Page title="Flows">
      <Layout>
        {/* Your Flows Section */}
        <Layout.Section>
          <Card padding="400">
            <BlockStack spacing="400">
              <Text variant="headingMd" as="h2">
                Your Flows
              </Text>
              {flows.length === 0 ? (
                <Text tone="subdued">You don’t have any flows yet.</Text>
              ) : (
                <BlockStack spacing="200">
                  {flows.map((flow) => (
                    <Card
                      key={flow.id}
                      padding="400"
                      onClick={() => handleRun(flow.id)}
                    >
                      <InlineStack align="space-between" blockAlign="center">
                        {/* Titel + Beschreibung */}
                        <BlockStack>
                          <Text variant="headingSm" fontWeight="bold">
                            {flow.title}
                          </Text>
                          <Text tone="subdued">{flow.description}</Text>
                        </BlockStack>

                        {/* Action Buttons */}
                        <InlineStack spacing="200">
                          <Button
                            icon={<Icon source={EditIcon} />}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEdit(flow.id);
                            }}
                          />
                          <Button
                            icon={<Icon source={DeleteIcon} tone="critical" />}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(flow.id);
                            }}
                          />
                          <Button
                            icon={<Icon source={ArrowRightIcon} />}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRun(flow.id);
                            }}
                          />
                        </InlineStack>
                      </InlineStack>
                    </Card>
                  ))}
                </BlockStack>
              )}
            </BlockStack>
          </Card>
        </Layout.Section>

        {/* Nur ein universelles Create Flow */}
        <Layout.Section>
          <Card>
            <BlockStack gap="400" align="center">
              <Text variant="headingLg" as="h2">
                Create Flow
              </Text>

              <InlineStack
                align="space-between"
                blockAlign="center"
                style={{
                  border: "1px solid #dfe3e8",
                  borderRadius: "8px",
                  padding: "20px",
                  width: "100%",
                  maxWidth: "700px",
                  background: "#f9fafb",
                }}
              >
                <Text variant="bodyMd">
                  Create your own flow with custom prompts, sources and
                  destinations.
                </Text>
                <Button
                  primary
                  onClick={() => navigate("/app/flows/create")}
                >
                  Create Flow
                </Button>
              </InlineStack>
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
