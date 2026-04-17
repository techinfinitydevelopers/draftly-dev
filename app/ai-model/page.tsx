'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AIModelPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/engine');
  }, [router]);
  return (
    <div className="min-h-screen bg-obsidian flex items-center justify-center">
      <p className="text-mist">Redirecting to Engine...</p>
    </div>
  );
}
