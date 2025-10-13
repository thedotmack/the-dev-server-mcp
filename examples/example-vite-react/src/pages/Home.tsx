import { Link } from 'react-router-dom'

export default function Home() {
  return (
    <div className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-6">Example Vite React App</h1>
        <p className="text-lg mb-4">
          This is a basic Vite + React application managed by the-dev-server MCP.
        </p>
        <Link
          to="/docs"
          className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700"
        >
          View Documentation
        </Link>
      </div>
    </div>
  )
}
