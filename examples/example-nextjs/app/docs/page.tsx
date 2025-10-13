import Link from "next/link";
import ThemeToggle from "../components/ThemeToggle";

export default function Docs() {
  return (
    <div className="min-h-screen p-8 bg-white dark:bg-dark-bg transition-colors">
      <ThemeToggle />
      <div className="max-w-4xl mx-auto">
        <Link
          href="/"
          className="text-blue-600 dark:text-dark-accent hover:underline mb-4 inline-block"
        >
          ← Back to Home
        </Link>

        <h1 className="text-4xl font-bold mb-6 text-gray-900 dark:text-dark-text">
          Documentation
        </h1>

        <div className="space-y-8">
          <section>
            <h2 className="text-2xl font-semibold mb-3 text-gray-900 dark:text-dark-text">
              About This App
            </h2>
            <p className="text-gray-700 dark:text-dark-muted leading-relaxed">
              This Next.js application demonstrates how the-dev-server MCP manages development servers.
              The MCP provides a unified interface for registering, starting, stopping, and monitoring
              development servers across multiple projects.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3 text-gray-900 dark:text-dark-text">
              Getting Started
            </h2>
            <ol className="list-decimal list-inside space-y-2 text-gray-700 dark:text-dark-muted">
              <li>Register this server with the MCP</li>
              <li>Start the development server</li>
              <li>Make changes and see them reflected instantly</li>
              <li>Check server status anytime</li>
            </ol>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3 text-gray-900 dark:text-dark-text">
              Features
            </h2>
            <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-dark-muted">
              <li>Built with Next.js 15 and React 19</li>
              <li>Styled with Tailwind CSS</li>
              <li>TypeScript support</li>
              <li>Hot module replacement</li>
              <li>Managed by the-dev-server MCP</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3 text-gray-900 dark:text-dark-text">
              Commands
            </h2>
            <div className="bg-gray-100 dark:bg-dark-card p-4 rounded-lg font-mono text-sm space-y-2 text-gray-800 dark:text-dark-text border dark:border-dark-border">
              <div>
                <span className="text-blue-600 dark:text-dark-accent">npm run dev</span> - Start development server
              </div>
              <div>
                <span className="text-blue-600 dark:text-dark-accent">npm run build</span> - Build for production
              </div>
              <div>
                <span className="text-blue-600 dark:text-dark-accent">npm run start</span> - Start production server
              </div>
              <div>
                <span className="text-blue-600 dark:text-dark-accent">npm run lint</span> - Run ESLint
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
