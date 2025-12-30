export default function SignIn() {
  return (
    <div className="max-w-md mx-auto">
      <div className="bg-white rounded-lg shadow p-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6 text-center">
          Sign In
        </h1>
        
        <div className="text-center">
          <div className="text-6xl mb-4">🔐</div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Google OAuth Integration
          </h2>
          <p className="text-gray-600 mb-6">
            Connect your Google Calendar to get started
          </p>
          
          <button 
            className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            disabled
          >
            Sign in with Google
          </button>
          
          <p className="text-sm text-gray-500 mt-4">
            OAuth integration coming soon
          </p>
        </div>
      </div>
    </div>
  )
}