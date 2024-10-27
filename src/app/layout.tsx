import type { Metadata } from "next";
import "@/styles/globals.scss";
import "@radix-ui/themes/styles.css";
import { Theme } from "@radix-ui/themes";

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
        <Theme>{children}</Theme>
      </body>
    </html>
  );
}
