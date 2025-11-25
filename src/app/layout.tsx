import TopLoader from "@/components/common/TopLoader";
import AuthProvider from "@/components/provider/AuthProvider";
import { ClientReadyProvider } from "@/components/provider/ClientReadyProvider";
import {
  ColorSchemeScript,
  MantineProvider,
  mantineHtmlProps,
} from "@mantine/core";
import "@mantine/core/styles.css";
import "@mantine/dates/styles.css";
import { ModalsProvider } from "@mantine/modals";
import { Notifications } from "@mantine/notifications";
import "@mantine/notifications/styles.css";
import "mantine-datatable/styles.css";
import "./globals.css";

export const metadata = {
  title: "Keep - PH",
  description: "Keep - PH",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" {...mantineHtmlProps}>
      <head>
        <ColorSchemeScript defaultColorScheme="auto" />
      </head>
      <body>
        <MantineProvider
          theme={{
            fontFamily:
              "-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica, Arial, sans-serif, Apple Color Emoji, Segoe UI Emoji",
            defaultRadius: "md",
          }}
          defaultColorScheme="light"
        >
          <ModalsProvider>
            <ClientReadyProvider>
              <TopLoader />
              <Notifications />
              <AuthProvider>{children}</AuthProvider>
            </ClientReadyProvider>
          </ModalsProvider>
        </MantineProvider>
      </body>
    </html>
  );
}
