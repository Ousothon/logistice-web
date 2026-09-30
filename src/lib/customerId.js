// Used only when Supabase isn't configured (see supabaseClient.js).
// Once connected, the real Customer ID comes from the `customer_code_seq`
// + trigger in supabase/schema.sql instead of this.
export function generateMockCustomerId() {
  const n = Math.floor(900000 + Math.random() * 99999)
  return `KH-${String(n).slice(0, 6)}`
}
