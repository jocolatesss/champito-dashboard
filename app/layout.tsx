import "./globals.css";

export const metadata = {
  title: "Champito Coaching — Quick Glance",
  description: "5-second student status dashboard",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
