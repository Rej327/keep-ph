"use client";

import { UserPhysicalAddress } from "@/actions/supabase/get";
import {
  ActionIcon,
  Button,
  CopyButton,
  Group,
  Paper,
  Stack,
  Text,
  Title,
  Tooltip,
  Badge,
  SimpleGrid,
  Modal,
  TextInput,
  Checkbox,
  Popover,
  Box,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import {
  IconCheck,
  IconCopy,
  IconMapPin,
  IconBuilding,
  IconId,
  IconPlus,
  IconTrash,
  IconHome,
  IconEdit,
  IconStar,
  IconStarFilled,
} from "@tabler/icons-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { notifications } from "@mantine/notifications";
import { updateUserPhysicalAddress } from "@/actions/supabase/update";
import { addUserPhysicalAddress } from "@/actions/supabase/post";
import { deleteUserPhysicalAddress } from "@/actions/supabase/delete";

export type AddressDetail = {
  account_number: string;
  mailroom_address_id: string;
  mailroom_address_key: string;
  mailroom_address_value: string;
  mailroom_address_link: string | null;
};

type Props = {
  address: AddressDetail | null;
  physicalAddresses: UserPhysicalAddress[];
  userId: string;
};

type AddressFormValues = {
  label: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  province: string;
  postalCode: string;
  country: string;
  isDefault: boolean;
};

function DeleteAddressButton({ onDelete }: { onDelete: () => void }) {
  const [opened, setOpened] = useState(false);

  return (
    <Popover
      opened={opened}
      onChange={setOpened}
      withArrow
      position="bottom"
      shadow="md"
      trapFocus
    >
      <Popover.Target>
        <Tooltip label="Delete">
          <ActionIcon
            color="red"
            variant="subtle"
            size="sm"
            onClick={() => setOpened((o) => !o)}
          >
            <IconTrash size={16} />
          </ActionIcon>
        </Tooltip>
      </Popover.Target>
      <Popover.Dropdown>
        <Text size="sm" mb="xs">
          Are you sure you want to delete this address?
        </Text>
        <Group gap="xs" justify="flex-end">
          <Button variant="default" size="xs" onClick={() => setOpened(false)}>
            Cancel
          </Button>
          <Button
            color="red"
            size="xs"
            onClick={() => {
              onDelete();
              setOpened(false);
            }}
          >
            Delete
          </Button>
        </Group>
      </Popover.Dropdown>
    </Popover>
  );
}

export default function AddressInfo({
  address,
  physicalAddresses,
  userId,
}: Props) {
  const [opened, { open, close }] = useDisclosure(false);
  const [isLoading, setIsLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<AddressFormValues>({
    defaultValues: {
      country: "Philippines",
      isDefault: false,
    },
  });

  if (!address) return null;

  const handleOpenAdd = () => {
    setEditingId(null);
    reset({
      label: "",
      addressLine1: "",
      addressLine2: "",
      city: "",
      province: "",
      postalCode: "",
      country: "Philippines",
      isDefault: false,
    });
    open();
  };

  const handleEdit = (addr: UserPhysicalAddress) => {
    setEditingId(addr.user_address_id);
    setValue("label", addr.user_address_label || "");
    setValue("addressLine1", addr.user_address_line1);
    setValue("addressLine2", addr.user_address_line2 || "");
    setValue("city", addr.user_address_city);
    setValue("province", addr.user_address_province);
    setValue("postalCode", addr.user_address_postal_code);
    setValue("country", addr.user_address_country);
    setValue("isDefault", addr.user_address_is_default);
    open();
  };

  const onSubmit = async (data: AddressFormValues) => {
    setIsLoading(true);
    try {
      let result;
      if (editingId) {
        result = await updateUserPhysicalAddress({
          userAddressId: editingId,
          userId,
          label: data.label,
          addressLine1: data.addressLine1,
          addressLine2: data.addressLine2,
          city: data.city,
          province: data.province,
          postalCode: data.postalCode,
          country: data.country,
          isDefault: data.isDefault,
        });
      } else {
        result = await addUserPhysicalAddress({
          userId,
          label: data.label,
          addressLine1: data.addressLine1,
          addressLine2: data.addressLine2,
          city: data.city,
          province: data.province,
          postalCode: data.postalCode,
          country: data.country,
          isDefault: data.isDefault,
        });
      }

      if (result.error) throw result.error;

      notifications.show({
        title: "Success",
        message: editingId
          ? "Address updated successfully"
          : "Address added successfully",
        color: "green",
      });
      reset();
      close();
      window.location.reload();
    } catch {
      notifications.show({
        title: "Error",
        message: editingId
          ? "Failed to update address"
          : "Failed to add address",
        color: "red",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSetDefault = async (addr: UserPhysicalAddress) => {
    if (addr.user_address_is_default) return; // Already default

    try {
      const result = await updateUserPhysicalAddress({
        userAddressId: addr.user_address_id,
        userId,
        isDefault: true,
      });

      if (result.error) throw result.error;

      notifications.show({
        title: "Success",
        message: "Default address updated",
        color: "green",
      });
      window.location.reload();
    } catch {
      notifications.show({
        title: "Error",
        message: "Failed to set default address",
        color: "red",
      });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const result = await deleteUserPhysicalAddress(id, userId);
      if (result.error) throw result.error;

      notifications.show({
        title: "Success",
        message: "Address deleted",
        color: "blue",
      });
      window.location.reload();
    } catch {
      notifications.show({
        title: "Error",
        message: "Failed to delete address",
        color: "red",
      });
    }
  };

  return (
    <>
      <Paper p="xl" radius="md" withBorder mt="lg">
        <Group justify="space-between" mb="lg">
          <Title order={4}>My Virtual Address</Title>
        </Group>

        <Stack gap="md">
          {/* Complete Shipping Address */}
          <Paper withBorder p="md" bg="gray.0">
            <Stack gap="xs">
              <Group justify="space-between" align="start">
                <Group gap="xs">
                  <IconMapPin size={20} className="text-gray-500" />
                  <Text fw={500} size="sm" c="dimmed">
                    Shipping Address
                  </Text>
                </Group>
                <CopyButton
                  value={`ACC #${address.account_number} - ${address.mailroom_address_value}`}
                  timeout={2000}
                >
                  {({ copied, copy }) => (
                    <Tooltip
                      label={copied ? "Copied" : "Copy Address"}
                      withArrow
                      position="left"
                    >
                      <ActionIcon
                        color={copied ? "teal" : "gray"}
                        variant="subtle"
                        onClick={copy}
                      >
                        {copied ? (
                          <IconCheck size={16} />
                        ) : (
                          <IconCopy size={16} />
                        )}
                      </ActionIcon>
                    </Tooltip>
                  )}
                </CopyButton>
              </Group>
              <Text size="md" fw={500} style={{ lineHeight: 1.4 }}>
                ACC #{address.account_number} - {address.mailroom_address_value}
              </Text>
            </Stack>
          </Paper>

          <SimpleGrid cols={{ base: 1, md: 2 }}>
            {/* Account Number */}
            <Paper withBorder p="md" bg="gray.0">
              <Stack gap="xs">
                <Group justify="space-between" align="start">
                  <Group gap="xs">
                    <IconId size={20} className="text-gray-500" />
                    <Text fw={500} size="sm" c="dimmed">
                      Account Number
                    </Text>
                  </Group>
                  <CopyButton
                    value={`ACC #${address.account_number}`}
                    timeout={2000}
                  >
                    {({ copied, copy }) => (
                      <Tooltip
                        label={copied ? "Copied" : "Copy"}
                        withArrow
                        position="left"
                      >
                        <ActionIcon
                          color={copied ? "teal" : "gray"}
                          variant="subtle"
                          onClick={copy}
                        >
                          {copied ? (
                            <IconCheck size={16} />
                          ) : (
                            <IconCopy size={16} />
                          )}
                        </ActionIcon>
                      </Tooltip>
                    )}
                  </CopyButton>
                </Group>
                <Text size="sm" fw={500}>
                  ACC #{address.account_number}
                </Text>
              </Stack>
            </Paper>

            {/* Physical Address */}
            <Paper withBorder p="md" bg="gray.0">
              <Stack gap="xs">
                <Group justify="space-between" align="start">
                  <Group gap="xs">
                    <IconBuilding size={20} className="text-gray-500" />
                    <Text fw={500} size="sm" c="dimmed">
                      Office Address
                    </Text>
                  </Group>
                  <CopyButton
                    value={address.mailroom_address_value}
                    timeout={2000}
                  >
                    {({ copied, copy }) => (
                      <Tooltip
                        label={copied ? "Copied" : "Copy"}
                        withArrow
                        position="left"
                      >
                        <ActionIcon
                          color={copied ? "teal" : "gray"}
                          variant="subtle"
                          onClick={copy}
                        >
                          {copied ? (
                            <IconCheck size={16} />
                          ) : (
                            <IconCopy size={16} />
                          )}
                        </ActionIcon>
                      </Tooltip>
                    )}
                  </CopyButton>
                </Group>
                <Text size="sm" fw={500} style={{ lineHeight: 1.4 }}>
                  {address.mailroom_address_value}
                </Text>
              </Stack>
            </Paper>
          </SimpleGrid>
        </Stack>
      </Paper>

      {/* Physical Addresses Section */}
      <Paper p="xl" radius="md" withBorder mt="lg">
        <Group justify="space-between" mb="lg">
          <Box>
            <Title order={4}>Customer Addresses</Title>
            <Text c="dimmed">Where do you want us to deliver your mail?</Text>
          </Box>

          <Button
            leftSection={<IconPlus size={16} />}
            onClick={handleOpenAdd}
            variant="light"
            style={{ alignSelf: "flex-start" }}
          >
            Add Address
          </Button>
        </Group>

        {physicalAddresses.length === 0 ? (
          <Text size="sm" c="dimmed" ta="center" py="xl">
            No physical addresses added yet.
          </Text>
        ) : (
          <SimpleGrid cols={{ base: 1, md: 2 }}>
            {physicalAddresses.map((addr) => (
              <Paper key={addr.user_address_id} withBorder p="md">
                <Group justify="space-between" mb="xs" align="start">
                  <Group gap="xs">
                    <IconHome size={18} className="text-blue-600" />
                    <Text fw={600}>
                      {addr.user_address_label || "My Address"}
                    </Text>
                    {addr.user_address_is_default && (
                      <Badge size="xs" color="blue" variant="light">
                        Default
                      </Badge>
                    )}
                  </Group>
                  <Group gap={4}>
                    <Tooltip label="Set as Default">
                      <ActionIcon
                        variant="subtle"
                        color={addr.user_address_is_default ? "yellow" : "gray"}
                        size="sm"
                        onClick={() => handleSetDefault(addr)}
                      >
                        {addr.user_address_is_default ? (
                          <IconStarFilled size={16} />
                        ) : (
                          <IconStar size={16} />
                        )}
                      </ActionIcon>
                    </Tooltip>
                    <Tooltip label="Edit">
                      <ActionIcon
                        variant="subtle"
                        color="blue"
                        size="sm"
                        onClick={() => handleEdit(addr)}
                      >
                        <IconEdit size={16} />
                      </ActionIcon>
                    </Tooltip>
                    <DeleteAddressButton
                      onDelete={() => handleDelete(addr.user_address_id)}
                    />
                  </Group>
                </Group>
                <Text size="sm" style={{ lineHeight: 1.4 }}>
                  {addr.user_address_line1}
                  {addr.user_address_line2 && `, ${addr.user_address_line2}`}
                  <br />
                  {addr.user_address_city}, {addr.user_address_province}{" "}
                  {addr.user_address_postal_code}
                  <br />
                  {addr.user_address_country}
                </Text>
              </Paper>
            ))}
          </SimpleGrid>
        )}
      </Paper>

      <Modal
        opened={opened}
        onClose={close}
        title={editingId ? "Edit Physical Address" : "Add Physical Address"}
        centered
      >
        <form onSubmit={handleSubmit(onSubmit)}>
          <Stack>
            <TextInput
              label="Label"
              placeholder="Home, Office, etc."
              {...register("label", { required: "Label is required" })}
              error={errors.label?.message}
            />
            <TextInput
              label="Address Line 1"
              placeholder="Street address, P.O. box, etc."
              {...register("addressLine1", { required: "Address is required" })}
              error={errors.addressLine1?.message}
            />
            <TextInput
              label="Address Line 2"
              placeholder="Apartment, suite, unit, etc. (optional)"
              {...register("addressLine2")}
            />
            <SimpleGrid cols={2}>
              <TextInput
                label="City"
                placeholder="City"
                {...register("city", { required: "City is required" })}
                error={errors.city?.message}
              />
              <TextInput
                label="Province"
                placeholder="Province"
                {...register("province", { required: "Province is required" })}
                error={errors.province?.message}
              />
            </SimpleGrid>
            <SimpleGrid cols={2}>
              <TextInput
                label="Postal Code"
                placeholder="Postal Code"
                {...register("postalCode", {
                  required: "Postal code is required",
                })}
                error={errors.postalCode?.message}
              />
              <TextInput
                label="Country"
                placeholder="Country"
                {...register("country", { required: "Country is required" })}
                error={errors.country?.message}
              />
            </SimpleGrid>

            <Checkbox
              label="Set as default address"
              {...register("isDefault")}
            />

            <Button type="submit" fullWidth loading={isLoading} mt="md">
              {editingId ? "Update Address" : "Save Address"}
            </Button>
          </Stack>
        </form>
      </Modal>
    </>
  );
}
