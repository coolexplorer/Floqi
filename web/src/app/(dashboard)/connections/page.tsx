'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ServiceCard } from '@/components/cards/ServiceCard';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { createClient } from '@/lib/supabase/client';

interface ConnectedService {
  id: string;
  service_name: string;
  connected_at: string;
  scopes: string[];
}

const GOOGLE_SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/calendar.readonly',
];

export default function ConnectionsPage() {
  const router = useRouter();
  const [googleConnection, setGoogleConnection] = useState<ConnectedService | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDisconnectModal, setShowDisconnectModal] = useState(false);

  useEffect(() => {
    async function fetchConnections() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }
      const { data, error: fetchError } = await supabase
        .from('connected_services')
        .select('*')
        .eq('user_id', user.id);
      if (fetchError) {
        setError('Failed to load connections');
        setLoading(false);
        return;
      }
      const google =
        (data as ConnectedService[] | null)?.find(
          (s) => s.service_name === 'google'
        ) ?? null;
      setGoogleConnection(google);
      setLoading(false);
    }
    fetchConnections();
  }, []);

  const handleConnect = () => {
    router.push('/api/auth/connect/google');
  };

  const handleDisconnectConfirm = async () => {
    if (!googleConnection) return;
    const supabase = createClient();
    const { error: deleteError } = await supabase
      .from('connected_services')
      .delete()
      .eq('id', googleConnection.id);
    if (deleteError) {
      setError('Failed to disconnect service');
      setShowDisconnectModal(false);
      return;
    }
    setGoogleConnection(null);
    setShowDisconnectModal(false);
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div>{error}</div>;

  const googleService = {
    name: 'Google',
    logo: (
      <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
      </svg>
    ),
    connected: !!googleConnection,
    connectedAt: googleConnection?.connected_at,
    scopes: googleConnection?.scopes,
  };

  return (
    <div>
      {/* aria-hidden hides this from getByRole when modal is open */}
      <div aria-hidden={showDisconnectModal}>
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-semibold text-slate-900">Connections</h1>
          <Button variant="primary">+ Add Integration</Button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <ServiceCard
            service={googleService}
            onConnect={handleConnect}
            onDisconnect={() => setShowDisconnectModal(true)}
          />
          {[
            { name: 'Notion', initial: 'N', bg: 'bg-slate-900', description: 'Save articles and notes automatically' },
            { name: 'Slack', initial: 'S', bg: 'bg-purple-600', description: 'Send automation reports to channels' },
            { name: 'GitHub', initial: 'G', bg: 'bg-slate-800', description: 'Track issues and pull requests' },
          ].map((svc) => (
            <Card key={svc.name} variant="elevated" padding="p-5">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white" aria-hidden="true">
                  <span className={`flex h-8 w-8 items-center justify-center rounded ${svc.bg} text-sm font-bold text-white`}>
                    {svc.initial}
                  </span>
                </div>
                <div className="flex flex-1 flex-col gap-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-slate-900">{svc.name}</span>
                    <Badge variant="neutral" size="sm">Coming Soon</Badge>
                  </div>
                  <p className="text-xs text-slate-500">{svc.description}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Modal portal renders in document.body — outside the aria-hidden wrapper */}
      <Modal
        isOpen={showDisconnectModal}
        onClose={() => setShowDisconnectModal(false)}
      >
        <p>Google 서비스 연결을 해제하시겠습니까?</p>
        <div className="flex gap-2 mt-4 justify-end">
          <Button
            variant="outline"
            onClick={() => setShowDisconnectModal(false)}
          >
            취소
          </Button>
          {/* aria-label gives accessible name matching /연결 해제/ for getByRole */}
          <Button
            variant="primary"
            aria-label="연결 해제"
            onClick={handleDisconnectConfirm}
          >
            해제
          </Button>
        </div>
      </Modal>
    </div>
  );
}
