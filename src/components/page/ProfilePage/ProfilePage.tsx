"use client";

import { UserPhysicalAddress, UserProfileDetail } from "@/actions/supabase/get";
import { Container, Stack, Text, Title } from "@mantine/core";
import AddressInfo, { AddressDetail } from "./AddressInfo";
import BasicInfo from "./BasicInfo";
import ChangePassword from "./ChangePassword";
import DeleteAccount from "./DeleteAccount";
import ReferredBy from "./ReferredBy";

type Props = {
  user: UserProfileDetail;
  address?: AddressDetail;
  physicalAddresses?: UserPhysicalAddress[];
};

export default function ProfilePage({
  user,
  address,
  physicalAddresses,
}: Props) {
  return (
    <Container size="md" py="xl">
      <Stack gap="xs" mb="xl">
        <Title order={2}>Profile Settings</Title>
        <Text c="dimmed">Manage your account details and preferences.</Text>
      </Stack>

      <BasicInfo user={user} />

      {address && (
        <AddressInfo
          address={address}
          physicalAddresses={physicalAddresses || []}
          userId={user.user_id}
        />
      )}

      <ChangePassword email={user.user_email} />

      <ReferredBy referredBy={user.user_referred_by} />

      <DeleteAccount email={user.user_email} userId={user.user_id} />
    </Container>
  );
}
