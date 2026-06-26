import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const url = request.nextUrl.clone();
  const hostname = request.headers.get('host') || '';
  const isLocalhost = hostname.includes('localhost') || hostname.includes('127.0.0.1');

  // Get allowed subdomains from environment variable or use defaults
  const allowedSubdomains = (process.env.ADMIN_SUBDOMAINS || 'cms,admin,back,portal').split(',');
  
  // Check if current hostname starts with any of the allowed subdomains (supports cms.domain.com and cms-verceldomain.vercel.app)
  const isAdminSubdomain = allowedSubdomains.some(sub => 
    hostname.startsWith(`${sub}.`) || hostname.startsWith(`${sub}-`)
  );

  // If accessing via the admin subdomain
  if (isAdminSubdomain) {
    // If accessing the root of the subdomain, rewrite to /admin
    if (url.pathname === '/') {
      url.pathname = '/admin';
      return NextResponse.rewrite(url);
    }
    
    // Rewrite all other paths under the subdomain to prepend /admin (unless already prepended)
    if (!url.pathname.startsWith('/admin')) {
      url.pathname = `/admin${url.pathname}`;
      return NextResponse.rewrite(url);
    }
  } else {
    // On production (non-localhost), block direct access to /admin routes by redirecting to root
    if (!isLocalhost && url.pathname.startsWith('/admin')) {
      url.pathname = '/';
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Apply to all routes except static files, assets and api routes (excluding api/submit)
    '/((?!_next/static|_next/image|favicon.ico|globe.svg|file.svg|vercel.svg|next.svg|window.svg).*)',
  ],
};
