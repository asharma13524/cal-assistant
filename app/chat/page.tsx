export default function Chat() {
  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">AI Calendar Assistant</h1>
      
      <div className="bg-white rounded-lg shadow flex flex-col h-[600px]">
        {/* Chat Messages Area */}
        <div className="flex-1 p-6 overflow-y-auto border-b">
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="text-6xl mb-4">🤖</div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                AI Chat Interface Coming Soon
              </h2>
              <p className="text-gray-600">
                Chat with your AI assistant about calendar events, scheduling, and more
              </p>
            </div>
          </div>
        </div>
        
        {/* Chat Input Area */}
        <div className="p-4">
          <div className="flex space-x-2">
            <input
              type="text"
              placeholder="Ask me about your calendar..."
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled
            />
            <button 
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled
            >
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}