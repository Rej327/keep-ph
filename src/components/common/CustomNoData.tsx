import { Center, Stack, Text } from "@mantine/core";
import Image from "next/image";

type CustomNoDataProps = {
  imageSrc?: string;
  imageAlt?: string;
  imageWidth?: number;
  imageHeight?: number;
  title?: string;
  description?: string;
  my?: number;
};

export default function CustomNoData({
  imageSrc = "/assets/icons/no-form.svg",
  imageAlt = "No data",
  imageWidth = 150,
  imageHeight = 150,
  title,
  description = "",
  my = 30,
}: CustomNoDataProps) {
  return (
    <Center my={my}>
      <Stack align="center" gap={16}>
        <Image
          src={imageSrc}
          alt={imageAlt}
          width={imageWidth}
          height={imageHeight}
        />
        {title && (
          <Text size="lg" fw={500} c="dark">
            {title}
          </Text>
        )}
        <Text size="sm" c="dimmed" ta="center">
          {description}
        </Text>
      </Stack>
    </Center>
  );
}
