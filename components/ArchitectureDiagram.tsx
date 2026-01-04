export function ArchitectureDiagram() {
  return (
    <svg
      width="900"
      height="1200"
      viewBox="0 0 900 1200"
      xmlns="http://www.w3.org/2000/svg"
      style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}
    >
      {/* Background */}
      <rect width="900" height="1200" fill="#f8fafc" />

      {/* Title */}
      <text x="450" y="40" fontSize="28" fontWeight="bold" textAnchor="middle" fill="#0f172a">
        Calendar Assistant Architecture
      </text>

      {/* User Input */}
      <rect x="350" y="80" width="200" height="60" rx="8" fill="#3b82f6" stroke="#2563eb" strokeWidth="2" />
      <text x="450" y="115" fontSize="16" fontWeight="600" textAnchor="middle" fill="white">
        User types in ChatWidget
      </text>

      {/* Arrow 1 */}
      <path d="M 450 140 L 450 180" stroke="#64748b" strokeWidth="3" fill="none" markerEnd="url(#arrowhead)" />

      {/* Chat API */}
      <rect x="350" y="180" width="200" height="60" rx="8" fill="#8b5cf6" stroke="#7c3aed" strokeWidth="2" />
      <text x="450" y="205" fontSize="14" fontWeight="600" textAnchor="middle" fill="white">
        /api/chat
      </text>
      <text x="450" y="225" fontSize="12" textAnchor="middle" fill="#e9d5ff">
        (Next.js API Route)
      </text>

      {/* Arrow 2 */}
      <path d="M 450 240 L 450 280" stroke="#64748b" strokeWidth="3" fill="none" markerEnd="url(#arrowhead)" />

      {/* Validation Layer Container */}
      <rect x="100" y="280" width="700" height="160" rx="12" fill="#e0f2fe" stroke="#0284c7" strokeWidth="2" strokeDasharray="6,3" />
      <text x="450" y="305" fontSize="16" fontWeight="bold" textAnchor="middle" fill="#075985">
        Validation &amp; Enforcement Layer
      </text>

      {/* Date Enforcer */}
      <rect x="130" y="320" width="200" height="50" rx="6" fill="#ffffff" stroke="#0284c7" strokeWidth="2" />
      <text x="230" y="340" fontSize="13" fontWeight="600" textAnchor="middle" fill="#0c4a6e">
        Date Enforcer
      </text>
      <text x="230" y="358" fontSize="10" textAnchor="middle" fill="#475569">
        MCP-like date context
      </text>

      {/* Action Detector */}
      <rect x="350" y="320" width="200" height="50" rx="6" fill="#ffffff" stroke="#0284c7" strokeWidth="2" />
      <text x="450" y="340" fontSize="13" fontWeight="600" textAnchor="middle" fill="#0c4a6e">
        Action Detector
      </text>
      <text x="450" y="358" fontSize="10" textAnchor="middle" fill="#475569">
        Detect user intent
      </text>

      {/* Date Validator */}
      <rect x="570" y="320" width="200" height="50" rx="6" fill="#ffffff" stroke="#0284c7" strokeWidth="2" />
      <text x="670" y="340" fontSize="13" fontWeight="600" textAnchor="middle" fill="#0c4a6e">
        Date Validator
      </text>
      <text x="670" y="358" fontSize="10" textAnchor="middle" fill="#475569">
        Verify dates used
      </text>

      {/* Action Validation (Post-execution) */}
      <rect x="240" y="380" width="420" height="45" rx="6" fill="#fef3c7" stroke="#f59e0b" strokeWidth="2" />
      <text x="450" y="398" fontSize="12" fontWeight="600" textAnchor="middle" fill="#92400e">
        Post-Execution: Validate required tools were called
      </text>
      <text x="450" y="413" fontSize="10" textAnchor="middle" fill="#78350f">
        (Retry loop if validation fails)
      </text>

      {/* Arrow 3 */}
      <path d="M 450 440 L 450 480" stroke="#64748b" strokeWidth="3" fill="none" markerEnd="url(#arrowhead)" />

      {/* Claude API */}
      <rect x="350" y="480" width="200" height="60" rx="8" fill="#ec4899" stroke="#db2777" strokeWidth="2" />
      <text x="450" y="505" fontSize="14" fontWeight="600" textAnchor="middle" fill="white">
        Claude API
      </text>
      <text x="450" y="525" fontSize="12" textAnchor="middle" fill="#fce7f3">
        (with tool definitions)
      </text>

      {/* Arrow 4 */}
      <path d="M 450 540 L 450 580" stroke="#64748b" strokeWidth="3" fill="none" markerEnd="url(#arrowhead)" />

      {/* Agentic Loop Container */}
      <rect x="100" y="580" width="700" height="240" rx="12" fill="#fef3c7" stroke="#f59e0b" strokeWidth="3" strokeDasharray="8,4" />
      <text x="450" y="610" fontSize="18" fontWeight="bold" textAnchor="middle" fill="#92400e">
        Agentic Loop (while stop_reason === 'tool_use')
      </text>

      {/* Loop Step 1 */}
      <rect x="150" y="630" width="250" height="50" rx="6" fill="#ffffff" stroke="#d97706" strokeWidth="2" />
      <text x="275" y="660" fontSize="13" fontWeight="500" textAnchor="middle" fill="#78350f">
        1. Claude requests tool
      </text>

      {/* Loop Step 2 */}
      <rect x="150" y="690" width="250" height="50" rx="6" fill="#ffffff" stroke="#d97706" strokeWidth="2" />
      <text x="275" y="715" fontSize="13" fontWeight="500" textAnchor="middle" fill="#78350f">
        2. Tool Executor validates
      </text>
      <text x="275" y="730" fontSize="10" textAnchor="middle" fill="#92400e">
        &amp; calls Google Calendar API
      </text>

      {/* Loop Step 3 */}
      <rect x="500" y="630" width="250" height="50" rx="6" fill="#ffffff" stroke="#d97706" strokeWidth="2" />
      <text x="625" y="660" fontSize="13" fontWeight="500" textAnchor="middle" fill="#78350f">
        3. Return result to Claude
      </text>

      {/* Loop Step 4 */}
      <rect x="500" y="690" width="250" height="50" rx="6" fill="#ffffff" stroke="#d97706" strokeWidth="2" />
      <text x="625" y="720" fontSize="13" fontWeight="500" textAnchor="middle" fill="#78350f">
        4. Repeat if more tools needed
      </text>

      {/* Loop arrows */}
      <path d="M 275 680 L 275 690" stroke="#d97706" strokeWidth="2" fill="none" markerEnd="url(#arrowhead-orange)" />
      <path d="M 400 655 L 500 655" stroke="#d97706" strokeWidth="2" fill="none" markerEnd="url(#arrowhead-orange)" />
      <path d="M 625 680 L 625 690" stroke="#d97706" strokeWidth="2" fill="none" markerEnd="url(#arrowhead-orange)" />

      {/* Loop back arrow */}
      <path d="M 625 740 L 625 770 L 275 770 L 275 740" stroke="#d97706" strokeWidth="2" strokeDasharray="4,2" fill="none" />
      <circle cx="275" cy="740" r="4" fill="#d97706" />

      {/* Arrow 5 - out of loop */}
      <path d="M 450 820 L 450 860" stroke="#64748b" strokeWidth="3" fill="none" markerEnd="url(#arrowhead)" />

      {/* Stream Response */}
      <rect x="300" y="860" width="300" height="60" rx="8" fill="#10b981" stroke="#059669" strokeWidth="2" />
      <text x="450" y="885" fontSize="14" fontWeight="600" textAnchor="middle" fill="white">
        Stream response to frontend
      </text>
      <text x="450" y="905" fontSize="12" textAnchor="middle" fill="#d1fae5">
        (text deltas + done event)
      </text>

      {/* Arrow 6 */}
      <path d="M 450 920 L 450 960" stroke="#64748b" strokeWidth="3" fill="none" markerEnd="url(#arrowhead)" />

      {/* Conditional Check */}
      <path d="M 450 960 L 530 1000 L 450 1040 L 370 1000 Z" fill="#f97316" stroke="#ea580c" strokeWidth="2" />
      <text x="450" y="1000" fontSize="13" fontWeight="600" textAnchor="middle" fill="white">
        modifiedEvents?
      </text>
      <text x="450" y="1018" fontSize="11" textAnchor="middle" fill="#fed7aa">
        (true)
      </text>

      {/* Arrow 7 - Yes path */}
      <path d="M 450 1040 L 450 1080" stroke="#64748b" strokeWidth="3" fill="none" markerEnd="url(#arrowhead)" />

      {/* SWR Invalidation */}
      <rect x="300" y="1080" width="300" height="80" rx="8" fill="#6366f1" stroke="#4f46e5" strokeWidth="2" />
      <text x="450" y="1110" fontSize="14" fontWeight="600" textAnchor="middle" fill="white">
        SWR cache invalidation
      </text>
      <text x="450" y="1130" fontSize="11" textAnchor="middle" fill="#c7d2fe">
        mutate('/api/calendar/events*')
      </text>
      <text x="450" y="1148" fontSize="11" textAnchor="middle" fill="#c7d2fe">
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
