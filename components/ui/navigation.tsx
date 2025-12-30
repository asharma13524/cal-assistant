import Link from 'next/link'

export function Navigation() {
  return (
    <nav className="bg-white shadow-sm border-b">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          <Link href="/" className="text-xl font-semibold text-gray-900">
            Calendar Assistant
          </Link>
          
          <div className="flex space-x-4">
            <Link 
              href="/calendar" 
              className="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
            >
              Calendar
            </Link>
            <Link 
              href="/chat" 
              className="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
            >
              Chat
            </Link>
            <Link 
              href="/auth/signin" 
              className="bg-blue-600 text-white hover:bg-blue-700 px-4 py-2 rounded-md text-sm font-medium"
            >
              Sign In
            </Link>
          </div>
        </div>
      </div>
    </nav>
  )
}