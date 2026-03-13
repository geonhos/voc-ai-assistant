interface ConversationDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function ConversationDetailPage({ params }: ConversationDetailPageProps) {
  const { id } = await params;

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-neutral-900">대화 상세</h1>
      <p className="mt-2 text-neutral-500">대화 ID: {id}</p>
      <p className="mt-1 text-neutral-500">고객 대화 상세 내용 및 AI 응답 내역</p>
    </div>
  );
}
