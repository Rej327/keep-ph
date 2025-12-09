import { submitUserVerification } from "@/actions/supabase/post";
import { uploadUserVerificationFile } from "@/actions/supabase/fileupload";
import {
  Button,
  FileInput,
  Group,
  Select,
  Stack,
  Text,
  TextInput,
  Title,
  Image,
  Box,
  Modal,
} from "@mantine/core";
import { useForm } from "react-hook-form";
import { useState, useRef, useCallback } from "react";
import Webcam from "react-webcam";
import { notifications } from "@mantine/notifications";
import { IconCamera, IconUpload } from "@tabler/icons-react";
import { useDisclosure } from "@mantine/hooks";

type VerificationFormValues = {
  idType: string;
  idNumber: string;
};

type Props = {
  userId: string;
  onComplete: () => void;
  onSkip: () => void;
};

export default function UserVerificationStep({
  userId,
  onComplete,
  onSkip,
}: Props) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<VerificationFormValues>();

  const [frontImage, setFrontImage] = useState<File | null>(null);
  const [backImage, setBackImage] = useState<File | null>(null);
  const [selfieImage, setSelfieImage] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [idType, setIdType] = useState<string | null>(null);

  // Camera handling
  const [cameraOpened, { open: openCamera, close: closeCamera }] =
    useDisclosure(false);
  const [cameraMode, setCameraMode] = useState<"front" | "back" | "selfie">(
    "front"
  );
  const webcamRef = useRef<Webcam>(null);

  const capture = useCallback(() => {
    const imageSrc = webcamRef.current?.getScreenshot();
    if (imageSrc) {
      fetch(imageSrc)
        .then((res) => res.blob())
        .then((blob) => {
          const file = new File([blob], `${cameraMode}.jpg`, {
            type: "image/jpeg",
          });
          if (cameraMode === "front") setFrontImage(file);
          if (cameraMode === "back") setBackImage(file);
          if (cameraMode === "selfie") setSelfieImage(file);
          closeCamera();
        });
    }
  }, [webcamRef, cameraMode, closeCamera]);

  const handleCameraOpen = (mode: "front" | "back" | "selfie") => {
    setCameraMode(mode);
    openCamera();
  };

  const onSubmit = async (data: VerificationFormValues) => {
    if (!frontImage || !selfieImage || !idType) {
      notifications.show({
        message: "Please provide Front ID and Selfie",
        color: "red",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Upload files
      const frontUpload = await uploadUserVerificationFile(userId, frontImage);
      if (frontUpload.error) throw frontUpload.error;

      let backUploadPath = null;
      if (backImage) {
        const backUpload = await uploadUserVerificationFile(userId, backImage);
        if (backUpload.error) throw backUpload.error;
        backUploadPath = backUpload.data?.path;
      }

      const selfieUpload = await uploadUserVerificationFile(
        userId,
        selfieImage
      );
      if (selfieUpload.error) throw selfieUpload.error;

      // Submit verification data
      const result = await submitUserVerification({
        userId,
        idType: idType,
        idNumber: data.idNumber,
        frontPath: frontUpload.data?.path || "",
        backPath: backUploadPath || undefined,
        selfiePath: selfieUpload.data?.path || "",
      });

      if (result.error) throw result.error;

      notifications.show({
        message: "Verification submitted successfully",
        color: "teal",
      });
      onComplete();
    } catch (error) {
      console.error(error);
      notifications.show({
        message: "Error submitting verification",
        color: "red",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const videoConstraints = {
    width: 1280,
    height: 720,
    facingMode: "user",
  };

  return (
    <Stack gap="md">
      <Stack gap="xs" align="center">
        <Title order={2}>Identity Verification</Title>
        <Text c="dimmed">Step 3: Verify your identity (Optional)</Text>
      </Stack>

      <form onSubmit={handleSubmit(onSubmit)}>
        <Stack gap="md">
          <Select
            label="ID Type"
            placeholder="Select ID Type"
            data={[
              "Passport",
              "Driver’s License",
              "National ID",
              "UMID",
              "PRC ID",
              "Postal ID",
              "Voter’s ID",
              "SSS ID",
              "PWD ID",
              "Senior Citizen ID",
              "OFW/OWWA ID",
              "Government Office ID (GOCC)",
            ]}
            value={idType}
            onChange={setIdType}
            required
          />

          <TextInput
            label="ID Number"
            placeholder="Enter ID Number"
            {...register("idNumber", { required: "ID Number is required" })}
            error={errors.idNumber?.message}
          />

          {/* Front ID */}
          <Box>
            <Text fw={500} size="sm" mb={5}>
              Front of ID <span className="text-red-500">*</span>
            </Text>
            {frontImage ? (
              <Group>
                <Image
                  src={URL.createObjectURL(frontImage)}
                  w={100}
                  h={60}
                  radius="md"
                  alt="Front ID"
                />
                <Button
                  variant="subtle"
                  color="red"
                  size="xs"
                  onClick={() => setFrontImage(null)}
                >
                  Remove
                </Button>
              </Group>
            ) : (
              <Group>
                <FileInput
                  accept="image/*"
                  onChange={setFrontImage}
                  style={{ flex: 1 }}
                  placeholder="Upload Image"
                  leftSection={<IconUpload size={14} />}
                />
                <Button
                  variant="light"
                  onClick={() => handleCameraOpen("front")}
                  leftSection={<IconCamera size={14} />}
                >
                  Camera
                </Button>
              </Group>
            )}
          </Box>

          {/* Back ID */}
          <Box>
            <Text fw={500} size="sm" mb={5}>
              Back of ID (Optional)
            </Text>
            {backImage ? (
              <Group>
                <Image
                  src={URL.createObjectURL(backImage)}
                  w={100}
                  h={60}
                  radius="md"
                  alt="Back ID"
                />
                <Button
                  variant="subtle"
                  color="red"
                  size="xs"
                  onClick={() => setBackImage(null)}
                >
                  Remove
                </Button>
              </Group>
            ) : (
              <Group>
                <FileInput
                  accept="image/*"
                  onChange={setBackImage}
                  style={{ flex: 1 }}
                  placeholder="Upload Image"
                  leftSection={<IconUpload size={14} />}
                />
                <Button
                  variant="light"
                  onClick={() => handleCameraOpen("back")}
                  leftSection={<IconCamera size={14} />}
                >
                  Camera
                </Button>
              </Group>
            )}
          </Box>

          {/* Selfie */}
          <Box>
            <Text fw={500} size="sm" mb={5}>
              Selfie <span className="text-red-500">*</span>
            </Text>
            {selfieImage ? (
              <Group>
                <Image
                  src={URL.createObjectURL(selfieImage)}
                  w={100}
                  h={100}
                  radius="md"
                  alt="Selfie"
                />
                <Button
                  variant="subtle"
                  color="red"
                  size="xs"
                  onClick={() => setSelfieImage(null)}
                >
                  Remove
                </Button>
              </Group>
            ) : (
              <Group>
                <FileInput
                  accept="image/*"
                  onChange={setSelfieImage}
                  style={{ flex: 1 }}
                  placeholder="Upload Image"
                  leftSection={<IconUpload size={14} />}
                />
                <Button
                  variant="light"
                  onClick={() => handleCameraOpen("selfie")}
                  leftSection={<IconCamera size={14} />}
                >
                  Camera
                </Button>
              </Group>
            )}
          </Box>

          <Group justify="space-between" mt="lg">
            <Button variant="default" onClick={onSkip} size="md">
              Skip for now
            </Button>
            <Button
              color="#1966D1"
              type="submit"
              size="md"
              loading={isSubmitting}
            >
              Submit Verification
            </Button>
          </Group>
        </Stack>
      </form>

      <Modal
        opened={cameraOpened}
        onClose={closeCamera}
        title="Take Photo"
        size="lg"
      >
        <Stack align="center">
          <Webcam
            audio={false}
            height={360}
            ref={webcamRef}
            screenshotFormat="image/jpeg"
            width={480}
            videoConstraints={videoConstraints}
          />
          <Button onClick={capture} color="#1966D1">
            Capture
          </Button>
        </Stack>
      </Modal>
    </Stack>
  );
}
