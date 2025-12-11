import TopLoader from "@/components/common/TopLoader";
import AuthProvider from "@/components/providers/AuthProvider";
import { ClientReadyProvider } from "@/components/providers/ClientReadyProvider";
import SWRProvider from "@/components/providers/SWRProvider";
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
import NotificationProvider from "@/components/providers/NotificationProvider";

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
    <html lang="en" data-scroll-behavior="smooth" {...mantineHtmlProps}>
      <head>
        <ColorSchemeScript defaultColorScheme="auto" />
      </head>
      <body suppressHydrationWarning={true}>
        <MantineProvider
          theme={{
            fontFamily:
              "-apple-system, Manrope, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica, Arial, sans-serif, Apple Color Emoji, Segoe UI Emoji",
            defaultRadius: "md",
          }}
          defaultColorScheme="light"
        >
          <NotificationProvider>
            <ModalsProvider>
              <ClientReadyProvider>
                <TopLoader />
                <Notifications />
                <AuthProvider>
                  <SWRProvider>{children}</SWRProvider>
                </AuthProvider>
              </ClientReadyProvider>
            </ModalsProvider>
          </NotificationProvider>
        </MantineProvider>
      </body>
    </html>
  );
}
