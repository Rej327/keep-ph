import {
  getUserPhysicalAddresses,
  UserFullDetails,
  UserPhysicalAddress,
  UserProfileDetail,
} from "@/actions/supabase/get";
import { AddressDetail } from "@/components/page/ProfilePage/AddressInfo";
import ProfilePageClient from "@/components/page/ProfilePage/ProfilePage";
import { createSupabaseServerClient } from "@/utils/supabase/serverClient";
import { redirect } from "next/navigation";

export default async function ProfilePage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Fetch user details via RPC
  const { data: fullDetailsData, error } = await supabase.rpc(
    "get_user_full_details",
    {
      input_user_id: user.id,
    }
  );

  if (error) {
    console.error("Error fetching profile:", error);
    // Handle error gracefully?
    return <div>Error loading profile</div>;
  }

  // Fetch physical addresses
  let physicalAddresses: UserPhysicalAddress[] = [];
  try {
    physicalAddresses = await getUserPhysicalAddresses(user.id);
  } catch (err) {
    console.error("Error fetching physical addresses:", err);
  }

  const fullDetails = fullDetailsData as UserFullDetails;
  const userDetails = fullDetails.user as UserProfileDetail;

  const addressDetails: AddressDetail | undefined =
    fullDetails.address && fullDetails.address.mailroom_address_id
      ? {
          ...fullDetails.address,
          account_number: fullDetails.account.account_number,
        }
      : undefined;

  // Generate public URL for avatar if exists
  if (userDetails.user_avatar_bucket_path) {
    const { data: publicUrlData } = supabase.storage
      .from("USER-AVATARS")
      .getPublicUrl(userDetails.user_avatar_bucket_path);
    userDetails.user_avatar_bucket_path = publicUrlData.publicUrl;
  }

  return (
    <ProfilePageClient
      user={userDetails}
      address={addressDetails}
      physicalAddresses={physicalAddresses}
    />
  );
}
