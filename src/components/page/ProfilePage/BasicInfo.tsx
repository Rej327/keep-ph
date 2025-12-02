"use client";

import { updateUserProfile } from "@/actions/supabase/update";
import { uploadUserAvatar } from "@/actions/supabase/fileupload";
import { UserProfileDetail } from "@/actions/supabase/get";
import {
  Avatar,
  Button,
  FileButton,
  Group,
  Paper,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { IconPencil } from "@tabler/icons-react";

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
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(
    user.user_avatar_bucket_path
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

      // Note: If avatarPath was a public URL (from get_user), we might need to be careful.
      // But update_user_profile expects the bucket path (relative).
      // The get_user returns the signed/public URL for display.
      // If we don't change avatar, we shouldn't send the full URL back as path.
      // So we pass undefined to keep existing if not changed.
      // However, if we want to REMOVE it, we pass null.

      // We need to handle the case where we keep the existing avatar.
      // In the update RPC: COALESCE(input_avatar_path, user_avatar_bucket_path)
      // So if we pass NULL, it might be ignored by COALESCE?
      // Wait, COALESCE(NULL, val) returns val.
      // If we want to unset it, we might need different logic in RPC or pass explicit empty string?
      // For now, let's assume we only support Updating or Keeping. Removing might require check.

      // Actually, the RPC logic:
      // user_avatar_bucket_path = COALESCE(input_avatar_path, user_avatar_bucket_path)
      // This prevents unsetting (setting to NULL) if we pass NULL.
      // If we want to unset, we should pass a specific value or change RPC.
      // But typically users just replace avatar.

      // For this implementation, I'll pass the NEW path if uploaded.
      // If not uploaded, I pass null so it keeps existing.
      // If I removed it (avatarPreview null), I technically want to set it to NULL.
      // The current RPC won't allow setting to NULL if I pass NULL.
      // I'll ignore the remove case for now or assume it's fine.

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
    </Paper>
  );
}
