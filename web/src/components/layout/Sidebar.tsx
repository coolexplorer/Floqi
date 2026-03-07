'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  LayoutDashboard,
  Zap,
  Link as LinkIcon,
  Activity,
  Settings as SettingsIcon,
  Bell,
  Search,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  LogOut
} from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'

interface NavItem {
  label: string
  href: string
  icon: React.ElementType
}

interface SidebarProps {
  currentPath: string
  userName: string
  userEmail: string
  userAvatar?: string
  onLogout: () => void
}

export function Sidebar({ currentPath, userName, userEmail, userAvatar, onLogout }: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false)

  const homeNav: NavItem[] = [
    { label: 'Dashboard', href: '/', icon: LayoutDashboard },
    { label: 'Automations', href: '/automations', icon: Zap },
    { label: 'Connections', href: '/connections', icon: LinkIcon },
  ]

  const settingsNav: NavItem[] = [
    { label: 'Log Activity', href: '/logs', icon: Activity },
    { label: 'Settings', href: '/settings', icon: SettingsIcon },
    { label: 'Notifications', href: '/notifications', icon: Bell },
  ]

  const isActive = (path: string) => {
    if (path === '/') {
      return currentPath === '/'
    }
    return currentPath.startsWith(path)
  }

  return (
    <aside
      className={`
        fixed left-0 top-0 h-screen bg-white border-r border-slate-200
        flex flex-col transition-all duration-normal ease-default
        ${isCollapsed ? 'w-16' : 'w-60'}
      `}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-200">
        {!isCollapsed && (
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-blue-600" />
            <span className="text-h5 font-semibold text-slate-900">Floqi</span>
          </div>
        )}
        {isCollapsed && <Sparkles className="w-5 h-5 text-blue-600 mx-auto" />}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-1 rounded-md hover:bg-slate-100 transition-colors"
          aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed ? (
            <ChevronRight className="w-4 h-4 text-slate-600" />
          ) : (
            <ChevronLeft className="w-4 h-4 text-slate-600" />
          )}
        </button>
      </div>

      {/* Search Bar */}
      {!isCollapsed && (
        <div className="px-3 py-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search"
              className="w-full h-10 pl-10 pr-16 bg-white border border-slate-200 rounded-lg text-body text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-600 transition-colors"
            />
            <kbd className="absolute right-2 top-1/2 -translate-y-1/2 px-2 py-0.5 bg-slate-100 text-caption text-slate-600 rounded-md border border-slate-200">
              ⌘K
            </kbd>
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-2">
        {/* Home Section */}
        {!isCollapsed && (
          <div className="mb-2">
            <p className="text-overline text-slate-500 px-3 mb-1">HOME</p>
          </div>
        )}
        <div className="space-y-1 mb-6">
          {homeNav.map((item) => {
            const Icon = item.icon
            const active = isActive(item.href)

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`
                  flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-normal
                  ${active
                    ? 'bg-slate-900 text-white font-semibold'
                    : 'text-slate-600 hover:bg-slate-100'
                  }
                  ${isCollapsed ? 'justify-center' : ''}
                `}
                title={isCollapsed ? item.label : undefined}
              >
                <Icon className={`w-5 h-5 ${active ? 'text-white' : 'text-slate-600'}`} />
                {!isCollapsed && <span className="text-body">{item.label}</span>}
              </Link>
            )
          })}
        </div>

        {/* Settings Section */}
        {!isCollapsed && (
          <div className="mb-2">
            <p className="text-overline text-slate-500 px-3 mb-1">SETTINGS</p>
          </div>
        )}
        <div className="space-y-1">
          {settingsNav.map((item) => {
            const Icon = item.icon
            const active = isActive(item.href)

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`
                  flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-normal
                  ${active
                    ? 'bg-slate-900 text-white font-semibold'
                    : 'text-slate-600 hover:bg-slate-100'
                  }
                  ${isCollapsed ? 'justify-center' : ''}
                `}
                title={isCollapsed ? item.label : undefined}
              >
                <Icon className={`w-5 h-5 ${active ? 'text-white' : 'text-slate-600'}`} />
                {!isCollapsed && <span className="text-body">{item.label}</span>}
              </Link>
            )
          })}
        </div>

        {/* Upgrade Card */}
        {!isCollapsed && (
          <div className="mt-8">
            <div className="relative p-4 bg-white rounded-xl border-2 border-transparent bg-gradient-to-br from-transparent via-transparent to-transparent"
              style={{
                backgroundImage: 'linear-gradient(white, white), linear-gradient(135deg, #3b82f6 0%, #f59e0b 100%)',
                backgroundOrigin: 'border-box',
                backgroundClip: 'padding-box, border-box',
              }}
            >
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-amber-500 flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-white" />
                </div>
                <div className="flex-1">
                  <p className="text-h6 font-semibold text-slate-900">Upgrade Pro Plan</p>
                  <p className="text-body-small text-slate-500">Unlock all features on Floqi</p>
                </div>
              </div>
              <Button variant="secondary" size="sm" className="w-full">
                Manage Plan
              </Button>
            </div>
          </div>
        )}
      </nav>

      {/* User Profile */}
      <div className="border-t border-slate-200 p-3">
        <div className={`flex items-center gap-3 ${isCollapsed ? 'justify-center' : ''}`}>
          <Avatar
            src={userAvatar}
            alt={userName}
            initials={userName.substring(0, 1).toUpperCase()}
            size="md"
          />
          {!isCollapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-body font-medium text-slate-900 truncate">{userName}</p>
              <p className="text-caption text-slate-500 truncate">{userEmail}</p>
            </div>
          )}
          <button
            onClick={onLogout}
            className="p-2 rounded-md hover:bg-slate-100 transition-colors"
            aria-label="Logout"
            title="Logout"
          >
            <LogOut className="w-4 h-4 text-slate-600" />
          </button>
        </div>
      </div>
    </aside>
  )
}
