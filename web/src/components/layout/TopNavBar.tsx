'use client'

import * as React from 'react'
import Link from 'next/link'
import { Sparkles, X, Menu } from 'lucide-react'
import { cn } from '@/lib/cn'
import { Button } from '../ui/Button'

interface NavLink {
  label: string
  href: string
}

export interface TopNavBarProps {
  transparent?: boolean
}

const navLinks: NavLink[] = [
  { label: 'Features', href: '/#features' },
  { label: 'Pricing', href: '/#pricing' },
  { label: 'Docs', href: '/docs' },
]

export function TopNavBar({ transparent = false }: TopNavBarProps) {
  const [scrolled, setScrolled] = React.useState(false)
  const [mobileOpen, setMobileOpen] = React.useState(false)
  const toggleButtonRef = React.useRef<HTMLButtonElement>(null)
  const firstMenuLinkRef = React.useRef<HTMLAnchorElement>(null)

  React.useEffect(() => {
    function handleScroll() {
      setScrolled(window.scrollY > 8)
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Close mobile menu on route change / resize
  React.useEffect(() => {
    function handleResize() {
      if (window.innerWidth >= 768) setMobileOpen(false)
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Focus management: move focus into/out of mobile menu
  React.useEffect(() => {
    if (mobileOpen) {
      firstMenuLinkRef.current?.focus()
    } else {
      toggleButtonRef.current?.focus()
    }
  }, [mobileOpen])

  const showBlur = transparent ? scrolled : true
  const isLight = transparent && !scrolled

  return (
    <>
      <header
        className={cn(
          'fixed inset-x-0 top-0 z-[200]',
          'transition-all duration-200',
          showBlur
            ? 'border-b border-white/10 bg-white/80 shadow-sm backdrop-blur-md'
            : 'border-b border-transparent bg-transparent'
        )}
      >
        <div className="mx-auto flex h-16 max-w-6xl items-center px-4 sm:px-6 lg:px-8">
          {/* Logo */}
          <Link
            href="/"
            aria-label="Floqi — go to homepage"
            className={cn(
              'flex items-center gap-2 rounded-md',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500'
            )}
          >
            <div
              className={cn(
                'flex h-8 w-8 items-center justify-center rounded-lg',
                isLight ? 'bg-white/20' : 'bg-slate-900'
              )}
              aria-hidden="true"
            >
              <Sparkles
                className={cn('h-4 w-4', isLight ? 'text-white' : 'text-white')}
              />
            </div>
            <span
              className={cn(
                'text-base font-semibold tracking-tight',
                isLight ? 'text-white' : 'text-slate-900'
              )}
            >
              Floqi
            </span>
          </Link>

          {/* Desktop nav */}
          <nav
            className="ml-8 hidden items-center gap-0.5 md:flex"
            aria-label="Main navigation"
          >
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  'rounded-md px-3 py-1.5 text-sm font-medium',
                  'transition-colors duration-150',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500',
                  isLight
                    ? 'text-white/80 hover:text-white hover:bg-white/10'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                )}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Desktop CTA buttons */}
          <div className="hidden items-center gap-2 md:flex">
            <Link
              href="/login"
              className={cn(
                'inline-flex h-9 items-center rounded-lg px-4 text-sm font-medium',
                'transition-colors duration-150',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500',
                isLight
                  ? 'text-white hover:bg-white/10'
                  : 'text-slate-700 hover:bg-slate-100'
              )}
            >
              Log in
            </Link>
            <Link
              href="/signup"
              className={cn(
                'inline-flex h-9 items-center rounded-lg px-4 text-sm font-medium',
                'transition-colors duration-150',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500',
                'bg-blue-600 text-white hover:bg-blue-700 shadow-sm'
              )}
            >
              <span>Sign up</span>
            </Link>
          </div>

          {/* Mobile menu button */}
          <button
            ref={toggleButtonRef}
            type="button"
            aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={mobileOpen}
            aria-controls="mobile-nav"
            onClick={() => setMobileOpen((v) => !v)}
            className={cn(
              'ml-2 flex h-9 w-9 items-center justify-center rounded-lg md:hidden',
              'transition-colors duration-150',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500',
              isLight ? 'text-white hover:bg-white/10' : 'text-slate-600 hover:bg-slate-100'
            )}
          >
            {mobileOpen ? (
              <X className="h-5 w-5" aria-hidden="true" />
            ) : (
              <Menu className="h-5 w-5" aria-hidden="true" />
            )}
          </button>
        </div>

        {/* Mobile nav panel */}
        {mobileOpen && (
          <nav
            id="mobile-nav"
            aria-label="Mobile navigation"
            className={cn(
              'border-t md:hidden',
              showBlur
                ? 'border-slate-200 bg-white/95 backdrop-blur-md'
                : 'border-white/10 bg-slate-900/95 backdrop-blur-md'
            )}
          >
            <div className="mx-auto max-w-6xl space-y-1 px-4 py-3 sm:px-6">
              {navLinks.map((link, index) => (
                <Link
                  key={link.href}
                  ref={index === 0 ? firstMenuLinkRef : undefined}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    'flex rounded-lg px-3 py-2.5 text-sm font-medium',
                    'transition-colors duration-150',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500',
                    showBlur
                      ? 'text-slate-700 hover:bg-slate-100'
                      : 'text-white/80 hover:bg-white/10 hover:text-white'
                  )}
                >
                  {link.label}
                </Link>
              ))}
              <div className="flex flex-col gap-2 pt-3 border-t border-slate-200">
                <Link
                  href="/login"
                  className={cn(
                    'flex h-10 items-center justify-center rounded-lg text-sm font-medium',
                    'border border-slate-200 text-slate-700 hover:bg-slate-50',
                    'transition-colors duration-150',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500'
                  )}
                >
                  Log in
                </Link>
                <Link
                  href="/signup"
                  className={cn(
                    'flex h-10 items-center justify-center rounded-lg text-sm font-medium',
                    'bg-blue-600 text-white hover:bg-blue-700',
                    'transition-colors duration-150',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500'
                  )}
                >
                  <span>Sign up</span>
                </Link>
              </div>
            </div>
          </nav>
        )}
      </header>

      {/* Spacer to offset fixed header */}
      <div className="h-16" aria-hidden="true" />
    </>
  )
}
