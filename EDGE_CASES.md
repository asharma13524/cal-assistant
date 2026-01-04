# Calendar Assistant - Edge Cases & Robustness Checklist

## ✅ Currently Handled
- [x] Wrong day-of-week calculations (date validation)
- [x] Claiming actions without tool calls (action validation)
- [x] Creating events in the past
- [x] Scheduling conflicts (check_availability)
- [x] Relative date terms in get_calendar_events
- [x] ISO format validation for event times

## ⚠️ Needs Implementation

### 1. TIME VALIDATION
- [ ] **End time before start time**
  - User: "Schedule meeting from 3pm to 2pm"
  - Should reject or auto-correct

- [ ] **Zero or negative duration**
  - start_time = end_time
  - Should require minimum duration (e.g., 15 mins)

- [ ] **Extremely long events**
  - Meeting spanning multiple days
  - Should warn or limit (e.g., max 8 hours)

- [ ] **AM/PM ambiguity**
  - User: "Schedule at 12" → 12 PM or 12 AM?
  - Default to business hours (12 PM)

### 2. EVENT ID VALIDATION
- [ ] **Event already deleted**
  - Claude tries to update/delete event that no longer exists
  - Should detect 404 and inform user

- [ ] **Wrong event selected**
  - Multiple "Coffee with Mike" events
  - Claude picks wrong one
  - Should ask user to disambiguate

- [ ] **Stale event IDs**
  - Event modified externally after ID was fetched
  - Should refetch before update

### 3. DUPLICATE DETECTION
- [ ] **Creating duplicate events**
  - User: "Schedule coffee with Mike Monday 3pm" (already exists)
  - Should detect and warn user

### 4. INFINITE LOOP PREVENTION
- [ ] **Validation retry loops**
  - Claude fails validation → retries → fails again → infinite loop
  - Limit retries to 2-3 max

- [ ] **Tool call loops**
  - Claude calling same tool repeatedly
  - Detect and break loop

### 5. CONVERSATION STATE
- [ ] **Date verification cache scope**
  - Currently cleared per request
  - Should be per-conversation (session-based)
  - Otherwise multi-turn conversations lose context

- [ ] **Tool call tracking across retries**
  - Retry mechanism might not track tools correctly
  - Could cause false validation failures

### 6. ATTENDEE VALIDATION
- [ ] **Invalid email addresses**
  - User: "Add attendee: mike"
  - Should require valid email format

- [ ] **Adding self as attendee**
  - Redundant, might cause issues
  - Should skip or warn

- [ ] **Duplicate attendees**
  - Same person added twice
  - Should deduplicate

### 7. API ERROR HANDLING
- [ ] **Google Calendar API rate limits**
  - Too many requests
  - Should exponential backoff + retry

- [ ] **Auth token expiration**
  - Token expires mid-conversation
  - Should refresh automatically

- [ ] **Network failures**
  - Transient errors
  - Should retry with backoff

### 8. INPUT SANITIZATION
- [ ] **XSS in event details**
  - Malicious HTML/JS in titles
  - Sanitize before storing

- [ ] **Very long inputs**
  - 10,000 character event description
  - Limit to reasonable length

### 9. NATURAL LANGUAGE AMBIGUITY
- [ ] **"Next Monday" when today is Monday**
  - Should mean 7 days from now, not today

- [ ] **Week boundary confusion**
  - Friday: "this week" vs "next week"
  - Need clear definition

- [ ] **Relative time edge cases**
  - "Tomorrow" at 11:59 PM
  - DST transitions

### 10. BUSINESS LOGIC
- [ ] **Non-business hours**
  - Scheduling at 3 AM
  - Should warn (but not block)

- [ ] **Buffer time between meetings**
  - Back-to-back meetings with no break
  - Should suggest buffer (optional)

- [ ] **Maximum meetings per day**
  - 20 meetings in one day
  - Should warn about overload

## 🎯 Priority Ranking

### P0 (Critical - Implement ASAP)
1. End time before start time validation
2. Event ID existence check (404 handling)
3. Infinite retry loop prevention
4. Conversation-scoped date verification cache

### P1 (High - Next Sprint)
5. Duplicate event detection
6. Invalid email validation
7. AM/PM ambiguity handling
8. Multiple event disambiguation

### P2 (Medium - Future)
9. API rate limiting + retries
10. Input length limits
11. Buffer time suggestions
12. Non-business hours warnings

### P3 (Low - Nice to Have)
13. XSS sanitization
14. Maximum meetings warning
15. Very long event warnings
