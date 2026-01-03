export function ArchitectureDiagram() {
  return (
    <svg
      width="800"
      height="1000"
      viewBox="0 0 800 1000"
      xmlns="http://www.w3.org/2000/svg"
      style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}
    >
      {/* Background */}
      <rect width="800" height="1000" fill="#f8fafc" />

      {/* Title */}
      <text x="400" y="40" fontSize="28" fontWeight="bold" textAnchor="middle" fill="#0f172a">
        Calendar Assistant Architecture
      </text>

      {/* User Input */}
      <rect x="300" y="80" width="200" height="60" rx="8" fill="#3b82f6" stroke="#2563eb" strokeWidth="2" />
      <text x="400" y="115" fontSize="16" fontWeight="600" textAnchor="middle" fill="white">
        User types in ChatWidget
      </text>

      {/* Arrow 1 */}
      <path d="M 400 140 L 400 180" stroke="#64748b" strokeWidth="3" fill="none" markerEnd="url(#arrowhead)" />

      {/* Chat API */}
      <rect x="300" y="180" width="200" height="60" rx="8" fill="#8b5cf6" stroke="#7c3aed" strokeWidth="2" />
      <text x="400" y="205" fontSize="14" fontWeight="600" textAnchor="middle" fill="white">
        /api/chat
      </text>
      <text x="400" y="225" fontSize="12" textAnchor="middle" fill="#e9d5ff">
        (Next.js API Route)
      </text>

      {/* Arrow 2 */}
      <path d="M 400 240 L 400 280" stroke="#64748b" strokeWidth="3" fill="none" markerEnd="url(#arrowhead)" />

      {/* Claude API */}
      <rect x="300" y="280" width="200" height="60" rx="8" fill="#ec4899" stroke="#db2777" strokeWidth="2" />
      <text x="400" y="305" fontSize="14" fontWeight="600" textAnchor="middle" fill="white">
        Claude API
      </text>
      <text x="400" y="325" fontSize="12" textAnchor="middle" fill="#fce7f3">
        (with tool definitions)
      </text>

      {/* Arrow 3 */}
      <path d="M 400 340 L 400 380" stroke="#64748b" strokeWidth="3" fill="none" markerEnd="url(#arrowhead)" />

      {/* Agentic Loop Container */}
      <rect x="50" y="380" width="700" height="240" rx="12" fill="#fef3c7" stroke="#f59e0b" strokeWidth="3" strokeDasharray="8,4" />
      <text x="400" y="410" fontSize="18" fontWeight="bold" textAnchor="middle" fill="#92400e">
        Agentic Loop (while stop_reason === 'tool_use')
      </text>

      {/* Loop Step 1 */}
      <rect x="100" y="430" width="250" height="50" rx="6" fill="#ffffff" stroke="#d97706" strokeWidth="2" />
      <text x="225" y="460" fontSize="13" fontWeight="500" textAnchor="middle" fill="#78350f">
        1. Claude requests tool
      </text>

      {/* Loop Step 2 */}
      <rect x="100" y="490" width="250" height="50" rx="6" fill="#ffffff" stroke="#d97706" strokeWidth="2" />
      <text x="225" y="520" fontSize="13" fontWeight="500" textAnchor="middle" fill="#78350f">
        2. Execute tool (Google API)
      </text>

      {/* Loop Step 3 */}
      <rect x="450" y="430" width="250" height="50" rx="6" fill="#ffffff" stroke="#d97706" strokeWidth="2" />
      <text x="575" y="460" fontSize="13" fontWeight="500" textAnchor="middle" fill="#78350f">
        3. Return result to Claude
      </text>

      {/* Loop Step 4 */}
      <rect x="450" y="490" width="250" height="50" rx="6" fill="#ffffff" stroke="#d97706" strokeWidth="2" />
      <text x="575" y="520" fontSize="13" fontWeight="500" textAnchor="middle" fill="#78350f">
        4. Repeat if more tools needed
      </text>

      {/* Loop arrows */}
      <path d="M 225 480 L 225 490" stroke="#d97706" strokeWidth="2" fill="none" markerEnd="url(#arrowhead-orange)" />
      <path d="M 350 455 L 450 455" stroke="#d97706" strokeWidth="2" fill="none" markerEnd="url(#arrowhead-orange)" />
      <path d="M 575 480 L 575 490" stroke="#d97706" strokeWidth="2" fill="none" markerEnd="url(#arrowhead-orange)" />

      {/* Loop back arrow */}
      <path d="M 575 540 L 575 570 L 225 570 L 225 540" stroke="#d97706" strokeWidth="2" strokeDasharray="4,2" fill="none" />
      <circle cx="225" cy="540" r="4" fill="#d97706" />

      {/* Arrow 4 - out of loop */}
      <path d="M 400 620 L 400 660" stroke="#64748b" strokeWidth="3" fill="none" markerEnd="url(#arrowhead)" />

      {/* Stream Response */}
      <rect x="250" y="660" width="300" height="60" rx="8" fill="#10b981" stroke="#059669" strokeWidth="2" />
      <text x="400" y="685" fontSize="14" fontWeight="600" textAnchor="middle" fill="white">
        Stream response to frontend
      </text>
      <text x="400" y="705" fontSize="12" textAnchor="middle" fill="#d1fae5">
        (text deltas + done event)
      </text>

      {/* Arrow 5 */}
      <path d="M 400 720 L 400 760" stroke="#64748b" strokeWidth="3" fill="none" markerEnd="url(#arrowhead)" />

      {/* Conditional Check */}
      <path d="M 400 760 L 480 800 L 400 840 L 320 800 Z" fill="#f97316" stroke="#ea580c" strokeWidth="2" />
      <text x="400" y="800" fontSize="13" fontWeight="600" textAnchor="middle" fill="white">
        modifiedEvents?
      </text>
      <text x="400" y="818" fontSize="11" textAnchor="middle" fill="#fed7aa">
        (true)
      </text>

      {/* Arrow 6 - Yes path */}
      <path d="M 400 840 L 400 880" stroke="#64748b" strokeWidth="3" fill="none" markerEnd="url(#arrowhead)" />

      {/* SWR Invalidation */}
      <rect x="250" y="880" width="300" height="80" rx="8" fill="#6366f1" stroke="#4f46e5" strokeWidth="2" />
      <text x="400" y="910" fontSize="14" fontWeight="600" textAnchor="middle" fill="white">
        SWR cache invalidation
      </text>
      <text x="400" y="930" fontSize="11" textAnchor="middle" fill="#c7d2fe">
        mutate('/api/calendar/events*')
      </text>
      <text x="400" y="948" fontSize="11" textAnchor="middle" fill="#c7d2fe">
        → Calendar views auto-refresh
      </text>

      {/* Arrow definitions */}
      <defs>
        <marker
          id="arrowhead"
          markerWidth="10"
          markerHeight="10"
          refX="9"
          refY="3"
          orient="auto"
        >
          <polygon points="0 0, 10 3, 0 6" fill="#64748b" />
        </marker>
        <marker
          id="arrowhead-orange"
          markerWidth="10"
          markerHeight="10"
          refX="9"
          refY="3"
          orient="auto"
        >
          <polygon points="0 0, 10 3, 0 6" fill="#d97706" />
        </marker>
      </defs>
    </svg>
  )
}
