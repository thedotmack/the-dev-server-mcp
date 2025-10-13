import { Link } from 'react-router-dom'

export default function Docs() {
  return (
    <div className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto">
        <Link to="/" className="text-blue-600 hover:underline mb-4 inline-block">
          ← Back to Home
        </Link>

        <h1 className="text-4xl font-bold mb-6">Documentation</h1>

        <div className="space-y-8">
          <section>
            <h2 className="text-2xl font-semibold mb-3">About This App</h2>
            <p className="text-gray-700 leading-relaxed">
              This Vite + React application demonstrates how the-dev-server MCP manages development servers.
              The MCP provides a unified interface for registering, starting, stopping, and monitoring
              development servers across multiple projects.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3">Getting Started</h2>
            <ol className="list-decimal list-inside space-y-2 text-gray-700">
              <li>Register this server with the MCP</li>
              <li>Start the development server</li>
              <li>Make changes and see them reflected instantly</li>
              <li>Check server status anytime</li>
            </ol>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3">Features</h2>
            <ul className="list-disc list-inside space-y-2 text-gray-700">
              <li>Built with Vite and React 19</li>
              <li>Styled with Tailwind CSS</li>
              <li>TypeScript support</li>
              <li>Lightning-fast HMR</li>
              <li>React Router for navigation</li>
              <li>Managed by the-dev-server MCP</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3">Commands</h2>
            <div className="bg-gray-100 p-4 rounded-lg font-mono text-sm space-y-2">
              <div><span className="text-blue-600">npm run dev</span> - Start development server</div>
              <div><span className="text-blue-600">npm run build</span> - Build for production</div>
              <div><span className="text-blue-600">npm run preview</span> - Preview production build</div>
              <div><span className="text-blue-600">npm run lint</span> - Run ESLint</div>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
