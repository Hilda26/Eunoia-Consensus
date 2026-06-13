import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/components/auth/Providers";
import { StoreProvider } from "@/hooks/useStore";

export const metadata: Metadata = {
  title: "Eunoia - Private wellness accountability",
  description: "A calm, private wellness accountability companion."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <StoreProvider>{children}</StoreProvider>
        </Providers>
      </body>
    </html>
  );
}
