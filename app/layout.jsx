import "./globals.css";

export const metadata = {
  title: "Rachael's Job Search \u2764\uFE0F | NYC + NJ + MA",
  description: "Rachael's curated directory of entry-level biomedical research, pharma, and biotech jobs for new graduates across NYC, New Jersey, and Massachusetts. Updated regularly.",
  keywords: "biomedical jobs, research assistant, new grad, NYC, New Jersey, Massachusetts, Boston, Cambridge, pharma, biotech, entry level",
  openGraph: {
    title: "Rachael's Job Search \u2764\uFE0F | NYC + NJ + MA",
    description: "Entry-level biomedical research jobs across academia, pharma, and biotech in NYC, NJ, and Massachusetts.",
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
