'use client';

import { useSession } from 'next-auth/react';
import { redirect } from 'next/navigation';
import ImageVocabularyGame from '@/components/ImageVocabularyGame';

export default function ImageVocabGamePage() {
  const { data: session, status } = useSession();

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 flex items-center justify-center">
        <div className="text-white">Đang tải...</div>
      </div>
    );
  }

  if (!session) {
    redirect('/auth/login');
  }

  const userId = (session.user as { id?: string })?.id || 'anonymous';

  return <ImageVocabularyGame userId={userId} />;
}
