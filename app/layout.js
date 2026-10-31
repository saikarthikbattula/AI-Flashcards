import "./globals.css";
import { ClerkProvider } from "@clerk/nextjs";
export const metadata = {
  title: "Recall / Make knowledge stick",
  description: "Turn notes into flashcards with Gemini. Study at your pace.",
};
export default function Layout({ children }) {
  const page = (
    <html lang="en">
      <body>
        <a className="skip" href="#main">
          Skip to content
        </a>
        {children}
      </body>
    </html>
  );
  return process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ? (
    <ClerkProvider>{page}</ClerkProvider>
  ) : (
    page
  );
}
