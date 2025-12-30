import Link from 'next/link'

export default function Home() {
  return (
    <div className="max-w-4xl mx-auto">
      <div className="text-center py-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-6">
          Welcome to Calendar Assistant
        </h1>
        <p className="text-xl text-gray-600 mb-8">
          AI-powered calendar management and scheduling assistant
        </p>
        
        <div className="grid md:grid-cols-2 gap-6 mt-12">
          <Link href="/calendar" className="group">
            <div className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow">
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                📅 Calendar View
              </h2>
              <p className="text-gray-600">
                View and manage your Google Calendar events with a clean, intuitive interface.
              </p>
            </div>
          </Link>
          
          <Link href="/chat" className="group">
            <div className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow">
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                💬 AI Chat
              </h2>
              <p className="text-gray-600">
                Chat with your AI assistant to analyze, create, and manage calendar events.
              </p>
            </div>
          </Link>
        </div>
        
        <div className="mt-8">
          <Link 
            href="/auth/signin"
            className="inline-flex items-center px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            Get Started
          </Link>
        </div>
      </div>
    </div>
  )
}