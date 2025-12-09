"use client";

import { updateUserProfile } from "@/actions/supabase/update";
import { uploadUserAvatar } from "@/actions/supabase/fileupload";
import {
  UserProfileDetail,
  getUserLatestVerification,
} from "@/actions/supabase/get";
import {
  Avatar,
  Badge,
  Button,
  FileButton,
  Group,
  Paper,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
  Title,
  Modal,
  Tooltip,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { IconPencil } from "@tabler/icons-react";
import UserVerificationStep from "../AuthPage/UserVerificationStep";
import useSWR from "swr";

type Props = {
  user: UserProfileDetail;
};

type FormValues = {
  firstName: string;
  lastName: string;
  username: string;
  phone: string;
};

export default function BasicInfo({ user }: Props) {
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isVerificationModalOpen, setIsVerificationModalOpen] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(
    user.user_avatar_bucket_path
  );

  const { data: verificationData, mutate: mutateVerification } = useSWR(
    `verification-${user.user_id}`,
    () => getUserLatestVerification(user.user_id)
  );

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    defaultValues: {
      firstName: user.user_first_name || "",
      lastName: user.user_last_name || "",
      username: user.user_username || "",
      phone: user.user_phone || "",
    },
  });

  const handleAvatarChange = (file: File | null) => {
    if (file) {
      setAvatarFile(file);
      setAvatarPreview(URL.createObjectURL(file));
      setIsEditing(true); // uploading avatar implies editing
    }
  };

  const handleRemoveAvatar = () => {
    setAvatarFile(null);
    setAvatarPreview(null);
    setIsEditing(true);
  };

  const onSubmit = async (data: FormValues) => {
    try {
      setIsLoading(true);
      let avatarPath = user.user_avatar_bucket_path;

      // If new file selected
      if (avatarFile) {
        const { data: uploadData, error: uploadError } = await uploadUserAvatar(
          user.user_id,
          avatarFile
        );
        if (uploadError) throw uploadError;
        avatarPath = uploadData.path;
      } else if (avatarPreview === null && user.user_avatar_bucket_path) {
        // If removed
        avatarPath = null;
      }

      const updatePayload = {
        user_id: user.user_id,
        first_name: data.firstName,
        last_name: data.lastName,
        username: data.username,
        phone: data.phone,
        avatar_path: avatarFile ? avatarPath : undefined, // Only send if changed
      };

      await updateUserProfile(updatePayload);

      notifications.show({
        title: "Success",
        message: "Profile updated successfully",
        color: "green",
      });
      setIsEditing(false);
      setAvatarFile(null);
      // Reload page or invalidate query?
      // Ideally we should use useRouter to refresh
      window.location.reload();
    } catch {
      notifications.show({
        title: "Error",
        message: "Failed to update profile",
        color: "red",
      });
    } finally {
      setIsLoading(false);
    }
  };

  let verificationBadge;
  if (user.user_is_verified) {
    verificationBadge = (
      <Badge variant="dot" color="green">
        Verified
      </Badge>
    );
  } else if (verificationData?.user_verification_status == "pending") {
    verificationBadge = (
      <Badge variant="dot" color="orange">
        Pending
      </Badge>
    );
  } else if (verificationData?.user_verification_status == "rejected") {
    verificationBadge = (
      <Tooltip
        label={
          verificationData.user_verification_reason || "Verification rejected"
        }
      >
        <Badge variant="dot" color="red" style={{ cursor: "help" }}>
          Rejected
        </Badge>
      </Tooltip>
    );
  } else {
    verificationBadge = (
      <Badge variant="dot" color="red">
        Not Verified
      </Badge>
    );
  }

  return (
    <Paper p="xl" radius="md" withBorder>
      <Group justify="space-between" mb="lg">
        <Title order={4}>Basic Info</Title>
        {!isEditing && (
          <IconPencil
            size={20}
            className="cursor-pointer text-gray-500 hover:text-blue-600"
            onClick={() => setIsEditing(true)}
          />
        )}
      </Group>

      <form onSubmit={handleSubmit(onSubmit)}>
        <Stack gap="lg">
          <Group align="center" gap="xl">
            <Avatar
              src={avatarPreview}
              size={80}
              radius={80}
              color="blue"
              name={`${user.user_first_name} ${user.user_last_name}`}
            />
            <Stack gap="xs">
              <Text fw={500}>Profile Photo</Text>
              <Text size="xs" c="dimmed">
                Update your photo.
              </Text>
            </Stack>
            {isEditing && (
              <Group gap="xs">
                <FileButton
                  onChange={handleAvatarChange}
                  accept="image/png,image/jpeg"
                >
                  {(props) => (
                    <Button {...props} variant="light" size="xs">
                      Upload
                    </Button>
                  )}
                </FileButton>
                <Button
                  variant="subtle"
                  color="red"
                  size="xs"
                  onClick={handleRemoveAvatar}
                >
                  Remove
                </Button>
              </Group>
            )}
          </Group>

          <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="lg">
            <TextInput
              label="First Name"
              disabled={!isEditing}
              {...register("firstName", { required: "First name is required" })}
              error={errors.firstName?.message}
            />
            <TextInput
              label="Last Name"
              disabled={!isEditing}
              {...register("lastName", { required: "Last name is required" })}
              error={errors.lastName?.message}
            />
            <TextInput
              label="Username"
              disabled={!isEditing}
              {...register("username")}
            />
            <TextInput
              label="Phone"
              disabled={!isEditing}
              placeholder="+63 917 123 4567"
              {...register("phone")}
            />
            <TextInput label="Email" disabled value={user.user_email} />
            <Group mt={{ md: 25, base: 0 }} style={{ alignSelf: "center" }}>
              {verificationBadge}

              {user.user_is_verified &&
              verificationData?.user_verification_status ===
                "approved" ? null : (
                <Button
                  variant="light"
                  size="xs"
                  onClick={() => setIsVerificationModalOpen(true)}
                >
                  {user.user_is_verified ? "Verified" : "Verify"}
                </Button>
              )}
            </Group>
          </SimpleGrid>

          {isEditing && (
            <Group justify="flex-end" mt="md">
              <Button
                variant="default"
                onClick={() => {
                  setIsEditing(false);
                  reset();
                  setAvatarFile(null);
                  setAvatarPreview(user.user_avatar_bucket_path);
                }}
              >
                Cancel
              </Button>
              <Button type="submit" loading={isLoading} color="blue">
                Save Changes
              </Button>
            </Group>
          )}
        </Stack>
      </form>

      <Modal
        opened={isVerificationModalOpen}
        onClose={() => setIsVerificationModalOpen(false)}
        size="lg"
        centered
        title="Identity Verification"
      >
        <UserVerificationStep
          userId={user.user_id}
          onComplete={() => {
            setIsVerificationModalOpen(false);
            mutateVerification();
            notifications.show({
              message: "Verification submitted! Please wait for approval.",
              color: "teal",
            });
          }}
          onSkip={() => setIsVerificationModalOpen(false)}
        />
      </Modal>
    </Paper>
  );
}
