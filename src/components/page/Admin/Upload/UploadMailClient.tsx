"use client";

import { useState, useRef } from "react";
import {
  Container,
  Title,
  Text,
  Stack,
  Group,
  Select,
  TextInput,
  Button,
  ThemeIcon,
  Box,
  Modal,
  Accordion,
  Image,
  Card,
  Paper,
  Loader,
} from "@mantine/core";
import { DateInput } from "@mantine/dates";
import {
  IconCheck,
  IconUpload,
  IconCloudUpload,
  IconX,
} from "@tabler/icons-react";
import { notifications } from "@mantine/notifications";
import useSWR from "swr";
import {
  getAllCustomers,
  getMailboxesByAccountId,
} from "@/actions/supabase/get";
import { createMailItem } from "@/actions/supabase/post";
import { CustomerApiResponse } from "@/components/page/Admin/Customers/CustomersClient";
import { uploadAttachmentfile } from "@/actions/supabase/fileupload";

type Mailbox = {
  mailbox_id: string;
  mailbox_label: string | null;
  mailbox_mail_remaining_space: number;
  mailbox_package_remaining_space: number;
};

export default function UploadMailClient() {
  const [activeStep, setActiveStep] = useState(0);
  const [selectedCustomer, setSelectedCustomer] = useState<string | null>(null);
  const [selectedMailbox, setSelectedMailbox] = useState<string | null>(null);
  const [itemName, setItemName] = useState("");
  const [sendDate, setSendDate] = useState<Date | null>(new Date());
  const [sendBy, setSendBy] = useState("");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploadType, setUploadType] = useState<"mail" | "package">("mail");
  const [uploading, setUploading] = useState(false);
  const [successModalOpen, setSuccessModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch customers for selection
  const { data: customers, isLoading: loadingCustomers } = useSWR<
    CustomerApiResponse[]
  >("all-customers", () => getAllCustomers());

  // Fetch mailboxes when a customer is selected
  const { data: mailboxes, isLoading: loadingMailboxes } = useSWR(
    selectedCustomer ? ["mailboxes", selectedCustomer] : null,
    () => getMailboxesByAccountId(selectedCustomer!) as Promise<Mailbox[]>
  );

  const customerOptions =
    customers?.map((c) => ({
      value: c.account_id,
      label: `${c.account_address_key} - ${c.account_number} — ${c.user_first_name} ${c.user_last_name}`,
    })) || [];

  const mailboxOptions =
    mailboxes?.map((m) => {
      const remainingSpace =
        uploadType === "mail"
          ? m.mailbox_mail_remaining_space
          : m.mailbox_package_remaining_space;

      return {
        value: m.mailbox_id,
        label:
          remainingSpace === 0
            ? `${m.mailbox_label} - Not Available`
            : m.mailbox_label || `Mailbox ${m.mailbox_id.substring(0, 8)}`,
        description: `${m.mailbox_label} - Remaining ${remainingSpace}`,
        remaining: remainingSpace,
        disabled: remainingSpace === 0,
      };
    }) || [];

  const handleNextStep = () => {
    const newErrors: Record<string, string> = {};

    if (!selectedCustomer) newErrors.selectedCustomer = "Customer is required";
    if (!itemName.trim()) newErrors.itemName = "Item name is required";
    if (!sendDate) newErrors.sendDate = "Received date is required";
    if (!selectedMailbox) newErrors.selectedMailbox = "Mailbox is required";
    if (!sendBy.trim()) newErrors.sendBy = "Item sender is required";
    if (!description.trim()) newErrors.description = "Description is required";

    setErrors(newErrors);

    if (Object.keys(newErrors).length === 0) {
      setActiveStep(1);
    } else {
      notifications.show({
        title: "Missing Information",
        message: "Please fill in all required fields.",
        color: "red",
      });
    }
  };

  const handleFileUpload = async () => {
    // Validate required fields
    if (!file || !selectedMailbox || !sendDate || !selectedCustomer) {
      notifications.show({
        title: "Missing Information",
        message:
          "Please ensure all required fields are filled and a file is selected.",
        color: "red",
      });
      return;
    }

    setUploading(true);
    try {
      setIsSubmitting(true);
      const { data: uploadData } = await uploadAttachmentfile(
        file,
        selectedMailbox
      );

      // 2. Create mail item record
      const { error: dbError } = await createMailItem({
        mailboxId: selectedMailbox,
        sender: sendBy, // Using itemName as sender
        description: description,
        itemName: itemName,
        imagePath: uploadData.path,
        receivedAt: sendDate,
        itemType: uploadType,
      });

      if (dbError) throw dbError;

      setSuccessModalOpen(true);
    } catch (error: unknown) {
      console.error(error);
      notifications.show({
        title: "Upload Failed",
        message:
          error instanceof Error
            ? error.message
            : "An error occurred while uploading.",
        color: "red",
      });
      setIsSubmitting(false);
    } finally {
      setUploading(false);
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setActiveStep(0);
    setSelectedCustomer(null);
    setSelectedMailbox(null);
    setItemName("");
    setSendDate(new Date());
    setSendBy("");
    setDescription("");
    setFile(null);
    setSuccessModalOpen(false);
    setUploadType("mail");
  };

  return (
    <Container fluid py="md">
      <Box mb="xl">
        <Title order={2}>Upload Received Item</Title>
        <Text c="dimmed">
          Follow the steps below to create a new scanned mail item for a
          customer.
        </Text>
      </Box>
      <Paper withBorder p="md" radius="md">
        <Accordion
          chevron={null}
          value={activeStep.toString()}
          onChange={(val) => setActiveStep(parseInt(val || "0"))}
        >
          <Accordion.Item value="0">
            <Accordion.Control>
              <Group>
                <ThemeIcon
                  size={32}
                  radius="xl"
                  color={activeStep >= 0 ? "blue" : "gray"}
                >
                  {activeStep > 0 ? (
                    <IconCheck size={18} />
                  ) : (
                    <Text size="sm" fw={700}>
                      1
                    </Text>
                  )}
                </ThemeIcon>
                <Box>
                  <Text fw={600}>Fill out mail details</Text>
                  <Text size="xs" c="dimmed">
                    {activeStep > 0
                      ? "Step 1 Completed"
                      : "Enter the information related to the mail item."}
                  </Text>
                </Box>
              </Group>
            </Accordion.Control>
            <Accordion.Panel>
              <Stack gap="md">
                <Group grow align="flex-start">
                  <Select
                    label="Customer Name"
                    required
                    data={customerOptions}
                    value={selectedCustomer}
                    onChange={(value) => {
                      setSelectedCustomer(value);
                      setSelectedMailbox(null);
                      setErrors((prev) => ({ ...prev, selectedCustomer: "" }));
                    }}
                    searchable
                    clearable
                    nothingFoundMessage="No customers found"
                    disabled={loadingCustomers}
                    error={errors.selectedCustomer}
                  />
                  <Group gap="xs" align="flex-start">
                    <Select
                      label="Type"
                      placeholder="Type"
                      required
                      data={[
                        { value: "mail", label: "Mail" },
                        { value: "package", label: "Package" },
                      ]}
                      value={uploadType}
                      allowDeselect={false}
                      w={110}
                      onChange={(value) => {
                        if (value) setUploadType(value as "mail" | "package");
                        setSelectedMailbox(null);
                      }}
                      disabled={!selectedCustomer || loadingMailboxes}
                    />
                    <Select
                      style={{ flex: 1 }}
                      label={
                        selectedMailbox && selectedCustomer
                          ? `Space Remaining: ${
                              mailboxOptions.find(
                                (m) => m.value === selectedMailbox
                              )?.remaining
                            }`
                          : "Mailbox"
                      }
                      required
                      placeholder="Select mailbox"
                      data={mailboxOptions}
                      value={selectedMailbox}
                      onChange={(value) => {
                        setSelectedMailbox(value);
                        setErrors((prev) => ({ ...prev, selectedMailbox: "" }));
                      }}
                      disabled={!selectedCustomer || loadingMailboxes}
                      nothingFoundMessage="No active mailboxes found"
                      error={errors.selectedMailbox}
                    />
                  </Group>
                </Group>

                <Group grow align="flex-start">
                  <TextInput
                    label="Item name"
                    required
                    value={itemName}
                    onChange={(e) => {
                      setItemName(e.currentTarget.value);
                      setErrors((prev) => ({ ...prev, itemName: "" }));
                    }}
                    error={errors.itemName}
                    disabled={!selectedCustomer || loadingMailboxes}
                  />
                  <TextInput
                    label="Description"
                    required
                    value={description}
                    onChange={(e) => {
                      setDescription(e.currentTarget.value);
                      setErrors((prev) => ({ ...prev, description: "" }));
                    }}
                    error={errors.description}
                    disabled={!selectedCustomer || loadingMailboxes}
                  />
                </Group>
                <Group grow align="flex-start">
                  <TextInput
                    label="Item Sender"
                    required
                    value={sendBy}
                    onChange={(e) => {
                      setSendBy(e.currentTarget.value);
                      setErrors((prev) => ({ ...prev, sendBy: "" }));
                    }}
                    error={errors.sendBy}
                    disabled={!selectedCustomer || loadingMailboxes}
                  />
                  <DateInput
                    label="Received Date"
                    required
                    value={sendDate}
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    onChange={(date: any) => {
                      setSendDate(date);
                      setErrors((prev) => ({ ...prev, sendDate: "" }));
                    }}
                    error={errors.sendDate}
                    maxDate={new Date()}
                    disabled={!selectedCustomer || loadingMailboxes}
                  />
                </Group>

                <Group justify="flex-end" mt="md">
                  <Button onClick={handleNextStep}>Next Step →</Button>
                </Group>
              </Stack>
            </Accordion.Panel>
          </Accordion.Item>

          {activeStep === 1 && (
            <Accordion.Item value="1">
              <Accordion.Control>
                <Group>
                  <ThemeIcon size={32} radius="xl" color="blue" variant="light">
                    <Text size="sm" fw={700} c="blue">
                      2
                    </Text>
                  </ThemeIcon>
                  <Box>
                    <Text fw={600}>Upload received file</Text>
                    <Text size="xs" c="dimmed">
                      Upload the document associated with this mail item.
                    </Text>
                  </Box>
                </Group>
              </Accordion.Control>
              <Accordion.Panel>
                <Stack gap="xl">
                  <Card
                    withBorder
                    radius="lg"
                    p="lg"
                    style={{ minHeight: 250 }}
                  >
                    {(() => {
                      if (file && file.type.startsWith("image/")) {
                        return (
                          <div
                            style={{
                              position: "relative",
                              textAlign: "center",
                            }}
                          >
                            <Image
                              src={URL.createObjectURL(file)}
                              alt="Upload preview"
                              height={200}
                              fit="contain"
                              radius="md"
                            />
                            <Button
                              size="sm"
                              variant="filled"
                              color="red"
                              style={{
                                position: "absolute",
                                top: 10,
                                right: 10,
                              }}
                              onClick={() => setFile(null)}
                              leftSection={<IconX size={16} />}
                            >
                              Remove
                            </Button>
                            <Text size="sm" c="dimmed" mt="sm">
                              {file.name}
                            </Text>
                          </div>
                        );
                      } else if (file) {
                        return (
                          <Stack align="center" gap="md">
                            <ThemeIcon size={60} radius="xl" color="blue.1">
                              <IconCloudUpload size={30} color="#228be6" />
                            </ThemeIcon>
                            <Text size="lg" fw={500}>
                              File Selected
                            </Text>
                            <Text size="sm" c="blue">
                              {file.name}
                            </Text>
                            <Button
                              variant="outline"
                              onClick={() => setFile(null)}
                              leftSection={<IconX size={16} />}
                            >
                              Remove File
                            </Button>
                          </Stack>
                        );
                      } else {
                        return (
                          <Stack
                            align="center"
                            gap="md"
                            style={{ cursor: "pointer" }}
                            onClick={() => fileInputRef.current?.click()}
                          >
                            <ThemeIcon size={60} radius="xl" color="blue.1">
                              <IconCloudUpload size={30} color="#228be6" />
                            </ThemeIcon>
                            <Text size="lg" fw={500}>
                              Drag & Drop file here
                            </Text>
                            <Text size="sm" c="dimmed">
                              PDF, JPG, or PNG. Max file size: 25MB
                            </Text>
                            <Button mt="md" variant="light">
                              Browse File
                            </Button>
                          </Stack>
                        );
                      }
                    })()}
                    <input
                      type="file"
                      accept="image/png,image/jpeg,application/pdf"
                      style={{ display: "none" }}
                      ref={fileInputRef}
                      onChange={(e) => {
                        const selectedFile = e.target.files?.[0];
                        if (selectedFile) setFile(selectedFile);
                      }}
                    />
                  </Card>
                  <Group justify="flex-end" mt="md">
                    <Button
                      size="sm"
                      variant="default"
                      onClick={() => setActiveStep(0)}
                    >
                      Back
                    </Button>
                    <Button
                      onClick={handleFileUpload}
                      loading={uploading}
                      size="sm"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? <Loader size="sm" /> : "Submit Upload"}
                    </Button>
                  </Group>
                </Stack>
              </Accordion.Panel>
            </Accordion.Item>
          )}
        </Accordion>
      </Paper>

      <Modal
        opened={successModalOpen}
        onClose={() => setSuccessModalOpen(false)}
        withCloseButton={false}
        closeOnClickOutside={false}
        centered
        padding="xl"
        radius="lg"
      >
        <Stack align="center" gap="md">
          <ThemeIcon size={60} radius="xl" color="green.1">
            <IconCheck size={32} color="green" />
          </ThemeIcon>
          <Title order={3}>Upload Successful!</Title>
          <Text c="dimmed" ta="center">
            Your scanned mail and its details have been saved.
          </Text>
          <Group>
            <Button
              variant="light"
              color="gray"
              leftSection={<IconUpload size={16} />}
              onClick={() => {
                // Navigate to view all items or similar
                notifications.show({ message: "Feature not implemented yet" });
              }}
            >
              View All Mail Items
            </Button>
            <Button onClick={resetForm} leftSection={<IconUpload size={16} />}>
              Upload Another
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Container>
  );
}
