import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthCheck } from "@/components/auth/AuthCheck";
import { SiteFilterProvider } from '@/context/SiteFilterContext';

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "XPO Dashboard",
  description: "Dashboard voor Kortrijk XPO",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AuthCheck />
        <SiteFilterProvider>
          {children}
        </SiteFilterProvider>
      </body>
    </html>
  );
}
