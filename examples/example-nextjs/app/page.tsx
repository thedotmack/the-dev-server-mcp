import Link from "next/link";
import ThemeToggle from "./components/ThemeToggle";

export default function Home() {
  return (
    <div className="min-h-screen p-8 bg-white dark:bg-dark-bg transition-colors">
      <ThemeToggle />
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-6 text-gray-900 dark:text-dark-text">
          Example Next.js App
        </h1>
        <p className="text-lg mb-4 text-gray-700 dark:text-dark-muted">
          This is a basic Next.js application managed by the-dev-server MCP.
        </p>
        <Link
          href="/docs"
          className="inline-block bg-blue-600 dark:bg-dark-accent text-white px-6 py-3 rounded-lg hover:bg-blue-700 dark:hover:bg-blue-500 transition-colors"
        >
          View Documentation
        </Link>
      </div>
    </div>
  );
}
