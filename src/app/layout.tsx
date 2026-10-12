import type { Metadata } from "next";
import "destyle.css";
import "@oricube/design-system/tokens.css";
import NextAuthProvider from "./_auth";
import { ChildrenProvider } from "./_children-provider";
import { Zen_Maru_Gothic } from "next/font/google";

export const metadata: Metadata = {
  title: "OriCube",
  description: "Origami 3D Viewer",
};
const ZenMaruFont = Zen_Maru_Gothic({
  weight: "700",
  subsets: ["latin"],
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body>
        <NextAuthProvider>
          <ChildrenProvider>
            <div className={ZenMaruFont.className}>{children}</div>
          </ChildrenProvider>
        </NextAuthProvider>
      </body>
    </html>
  );
}
