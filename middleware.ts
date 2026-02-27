import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Se Supabase não estiver configurado, bypass total (modo dev local)
const SUPABASE_ENABLED = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);


export async function middleware(request: NextRequest) {
  // Sem credenciais Supabase — deixa tudo passar (dev local sem auth)
  if (!SUPABASE_ENABLED) return NextResponse.next({ request });

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    SUPABASE_URL!,
    SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;
  const publicPaths = [
    '/login', '/auth/', '/api/health', '/_next', '/favicon.ico', '/images',
    // big-agi infrastructure routes (use client-side API keys, not Supabase auth)
    '/api/edge/', '/api/cloud/', '/api/trpc/',
    // static public files
    '/manifest.json', '/robots.txt', '/sitemap',
  ];
  const isPublicPath = publicPaths.some(p => pathname.startsWith(p));

  if (!user && !isPublicPath) {
    if (!pathname.startsWith('/api')) {
      const url = request.nextUrl.clone();
      url.pathname = '/login';
      return NextResponse.redirect(url);
    }
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return supabaseResponse;
}


export const config = {
  matcher: [
    /*
     * Match all request paths except static files
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
