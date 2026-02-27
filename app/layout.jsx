import "./globals.css";

export const metadata = {
  title: "Biomedical Research Job Hub | NYC + NJ",
  description: "Centralized directory of entry-level biomedical research, pharma, and biotech jobs for new graduates in the NYC and New Jersey area. Updated regularly.",
  keywords: "biomedical jobs, research assistant, new grad, NYC, New Jersey, pharma, biotech, entry level",
  openGraph: {
    title: "Biomedical Research Job Hub | NYC + NJ",
    description: "Entry-level biomedical research jobs across academia, pharma, and biotech in the tri-state area.",
    type: "website",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
