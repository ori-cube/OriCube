import type { Metadata } from "next";
import "@/styles/globals.scss";
import "@radix-ui/themes/styles.css";
import { Theme } from "@radix-ui/themes";
import NextAuthProvider from "./_auth";

export const metadata: Metadata = {
  title: "OriCube",
  description: "Origami 3D Viewer",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body>
        <NextAuthProvider>
          <Theme>{children}</Theme>
        </NextAuthProvider>
      </body>
    </html>
  );
}
