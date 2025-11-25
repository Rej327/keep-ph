import { Center, Loader, Stack } from "@mantine/core";

type CustomLoaderProps = {
  size?: string | number;
};

export default function CustomLoader({ size = "md" }: CustomLoaderProps) {
  return (
    <Center h={"100%"}>
      <Stack align="center">
        <Loader color="#1966D1" size={size} />
      </Stack>
    </Center>
  );
}
