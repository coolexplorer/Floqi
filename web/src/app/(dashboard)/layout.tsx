import { LogoutButton } from '@/components/auth/logout-button'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <span className="text-lg font-bold text-teal-600">Floqi</span>
            <a href="/dashboard" className="text-sm text-gray-600 hover:text-gray-900">
              Dashboard
            </a>
            <a href="/dashboard/connections" className="text-sm text-gray-600 hover:text-gray-900">
              Connections
            </a>
            <a href="/logs" className="text-sm text-gray-600 hover:text-gray-900">
              Logs
            </a>
          </div>
          <LogoutButton />
        </div>
      </nav>
      <main className="px-6 py-8">{children}</main>
    </div>
  );
}
