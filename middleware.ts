import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh the session (important for token refresh)
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Extraer rol del metadata
  const rol = user?.user_metadata?.rol || 'supervisor';

  const { pathname } = request.nextUrl;

  // Protected API routes: return 401 if not authenticated
  if (pathname.startsWith('/api/') && !user) {
    return NextResponse.json(
      { error: 'No autorizado' },
      { status: 401 }
    );
  }

  // Protected dashboard routes: redirect to login if not authenticated
  if (pathname.startsWith('/dashboard') && !user) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  // Already logged in users visiting login page: redirect to dashboard
  if (pathname === '/login' && user) {
    const url = request.nextUrl.clone();
    url.pathname = '/dashboard';
    return NextResponse.redirect(url);
  }

  // Validar acceso a rutas protegidas por rol
  const RUTAS_ADMIN = ['/dashboard/importar', '/dashboard/auditoria', '/dashboard/tributario'];
  if (RUTAS_ADMIN.some(r => pathname.startsWith(r)) && rol !== 'administrador') {
    const url = request.nextUrl.clone();
    url.pathname = '/dashboard';
    url.searchParams.set('error', 'sin_permisos');
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: ['/dashboard/:path*', '/api/:path*', '/login'],
};
