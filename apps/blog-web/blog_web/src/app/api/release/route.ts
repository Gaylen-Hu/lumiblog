export function GET() {
  const revision = process.env.VERCEL_GIT_COMMIT_SHA
  if (!revision || !/^[0-9a-f]{40}$/.test(revision)) return new Response(null, { status: 404 })
  return Response.json({ revision }, { headers: { 'Cache-Control': 'no-store' } })
}
