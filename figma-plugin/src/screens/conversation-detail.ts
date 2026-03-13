import { COLORS, RADIUS, SPACING } from '../utils/constants';
import {
  createAutoLayoutFrame, createText, createCircle,
  createBadge, buildAppShell, finalize, solidPaint,
} from '../utils/helpers';

export async function generateConversationDetail(): Promise<FrameNode[]> {
  const { root, content } = buildAppShell('대화 상세');

  // Override content to horizontal split
  content.layoutMode = 'HORIZONTAL';
  content.itemSpacing = 0;
  content.paddingTop = 0;
  content.paddingRight = 0;
  content.paddingBottom = 0;
  content.paddingLeft = 0;

  // ── Chat Log (Left 2/3) ──
  const chatPanel = createAutoLayoutFrame({
    name: 'Chat Log Panel',
    direction: 'VERTICAL',
    width: 'FILL',
    height: 'FILL',
  });

  // Back nav
  const backNav = createAutoLayoutFrame({
    name: 'Back Nav',
    direction: 'HORIZONTAL',
    width: 'FILL',
    height: 44,
    padding: { top: 8, right: 16, bottom: 8, left: 16 },
    gap: 8,
    stroke: COLORS.neutral300,
  });
  backNav.counterAxisAlignItems = 'CENTER';
  backNav.appendChild(createText({ text: '← 목록으로', size: 14, weight: 500, color: COLORS.primary }));
  backNav.appendChild(createText({ text: '대화 #C-20260313-001', size: 14, weight: 600, color: COLORS.neutral900 }));
  chatPanel.appendChild(backNav);

  // Messages
  const messages = createAutoLayoutFrame({
    name: 'Messages',
    direction: 'VERTICAL',
    width: 'FILL',
    height: 'FILL',
    fill: COLORS.neutral50,
    padding: 16,
    gap: 12,
  });

  // AI welcome
  const aiMsg1 = buildMessage('AI', '안녕하세요! AI 상담 도우미입니다.\n어떤 문제가 있으신가요?', '오후 2:30', COLORS.white, COLORS.neutral300);
  messages.appendChild(aiMsg1);

  // Customer
  const custMsg1 = buildCustomerMessage('결제가 안 돼요. 카드 결제 시 오류가 발생합니다.', '오후 2:31');
  messages.appendChild(custMsg1);

  // AI
  const aiMsg2 = buildMessage('AI', '결제 오류가 발생하셨군요.\n어떤 결제 수단을 사용하셨나요?', '오후 2:31', COLORS.white, COLORS.neutral300);
  messages.appendChild(aiMsg2);

  // Customer
  const custMsg2 = buildCustomerMessage('신용카드로 결제하려고 했어요. 삼성카드인데 계속 타임아웃 에러가 나요.', '오후 2:32');
  messages.appendChild(custMsg2);

  // AI
  const aiMsg3 = buildMessage('AI', '삼성카드 결제 시 타임아웃이 발생하는 상황이시군요.\n몇 가지 확인해 볼게요:\n1. 카드 한도를 확인해 주세요\n2. 앱 버전이 최신인지 확인해 주세요\n3. 다른 브라우저에서도 동일한지 확인해 주세요', '오후 2:32', COLORS.white, COLORS.neutral300);
  messages.appendChild(aiMsg3);

  // System message
  const sysMsg = createAutoLayoutFrame({ name: 'System Message', direction: 'HORIZONTAL', width: 'FILL', gap: 8 });
  sysMsg.primaryAxisAlignItems = 'CENTER';
  sysMsg.counterAxisAlignItems = 'CENTER';
  const line1 = createAutoLayoutFrame({ name: 'Line', direction: 'HORIZONTAL', width: 'FILL', height: 1, fill: COLORS.neutral300 });
  const sysText = createText({ text: '에스컬레이션 — 담당자에게 전달됨', size: 12, weight: 500, color: COLORS.neutral500 });
  const line2 = createAutoLayoutFrame({ name: 'Line', direction: 'HORIZONTAL', width: 'FILL', height: 1, fill: COLORS.neutral300 });
  sysMsg.appendChild(line1);
  sysMsg.appendChild(sysText);
  sysMsg.appendChild(line2);
  messages.appendChild(sysMsg);

  // Admin message
  const adminMsg = buildMessage('상담사', '안녕하세요, 담당자 김관리입니다.\n현재 삼성카드 PG 연동에 일시적 장애가 확인되었습니다.\n30분 내 복구 예정이며, 복구 후 결제 재시도 부탁드립니다.', '오후 2:45', COLORS.successLight, COLORS.successBorder, true);
  messages.appendChild(adminMsg);

  chatPanel.appendChild(messages);

  // Admin input area
  const adminInput = createAutoLayoutFrame({
    name: 'Admin Input',
    direction: 'HORIZONTAL',
    width: 'FILL',
    height: 56,
    fill: COLORS.white,
    padding: { top: 10, right: 12, bottom: 10, left: 16 },
    gap: 8,
    stroke: COLORS.neutral300,
  });
  adminInput.counterAxisAlignItems = 'CENTER';

  const inputField = createAutoLayoutFrame({ name: 'Input', direction: 'HORIZONTAL', width: 'FILL', height: 36, padding: { top: 8, right: 12, bottom: 8, left: 12 } });
  inputField.appendChild(createText({ text: '관리자 메시지 입력...', size: 14, color: COLORS.neutral500 }));
  adminInput.appendChild(inputField);

  const sendBtn = createAutoLayoutFrame({
    name: 'Send',
    direction: 'HORIZONTAL',
    height: 36,
    padding: { top: 8, right: 16, bottom: 8, left: 16 },
    fill: COLORS.success,
    cornerRadius: RADIUS.sm,
  });
  sendBtn.counterAxisAlignItems = 'CENTER';
  sendBtn.appendChild(createText({ text: '전송', size: 14, weight: 600, color: COLORS.white }));
  adminInput.appendChild(sendBtn);
  chatPanel.appendChild(adminInput);

  content.appendChild(chatPanel);

  // ── Info Panel (Right 1/3) ──
  const infoPanel = createAutoLayoutFrame({
    name: 'Info Panel',
    direction: 'VERTICAL',
    width: 340,
    height: 'FILL',
    fill: COLORS.white,
    padding: SPACING.base,
    gap: 20,
    stroke: COLORS.neutral300,
  });

  // Customer info
  const custSection = createAutoLayoutFrame({ name: 'Customer Info', direction: 'VERTICAL', width: 'FILL', gap: 8 });
  custSection.appendChild(createText({ text: '고객 정보', size: 14, weight: 600, color: COLORS.neutral900 }));

  const infoRows = [
    { label: '이름', value: '홍길동' },
    { label: '이메일', value: 'hong@email.com' },
  ];
  for (const info of infoRows) {
    const row = createAutoLayoutFrame({ name: `Info - ${info.label}`, direction: 'HORIZONTAL', width: 'FILL', gap: 8 });
    row.primaryAxisAlignItems = 'SPACE_BETWEEN';
    row.appendChild(createText({ text: info.label, size: 13, color: COLORS.neutral500 }));
    row.appendChild(createText({ text: info.value, size: 13, weight: 500, color: COLORS.neutral900 }));
    custSection.appendChild(row);
  }
  infoPanel.appendChild(custSection);

  // Conversation info
  const convSection = createAutoLayoutFrame({ name: 'Conversation Info', direction: 'VERTICAL', width: 'FILL', gap: 8 });
  convSection.appendChild(createText({ text: '대화 정보', size: 14, weight: 600, color: COLORS.neutral900 }));

  const convStatusRow = createAutoLayoutFrame({ name: 'Status Row', direction: 'HORIZONTAL', width: 'FILL' });
  convStatusRow.primaryAxisAlignItems = 'SPACE_BETWEEN';
  convStatusRow.counterAxisAlignItems = 'CENTER';
  convStatusRow.appendChild(createText({ text: '상태', size: 13, color: COLORS.neutral500 }));
  convStatusRow.appendChild(createBadge('에스컬레이션', '#FFFBEB', '#92400E'));
  convSection.appendChild(convStatusRow);

  const convDetails = [
    { label: '대화 시작', value: '2026-03-13 14:30' },
    { label: '총 메시지', value: '6' },
    { label: 'AI 시도', value: '3회' },
    { label: '평균 confidence', value: '0.48' },
  ];
  for (const d of convDetails) {
    const row = createAutoLayoutFrame({ name: `Detail - ${d.label}`, direction: 'HORIZONTAL', width: 'FILL' });
    row.primaryAxisAlignItems = 'SPACE_BETWEEN';
    row.appendChild(createText({ text: d.label, size: 13, color: COLORS.neutral500 }));
    row.appendChild(createText({ text: d.value, size: 13, weight: 500, color: COLORS.neutral900 }));
    convSection.appendChild(row);
  }
  infoPanel.appendChild(convSection);

  // Action buttons
  const actSection = createAutoLayoutFrame({ name: 'Actions', direction: 'VERTICAL', width: 'FILL', gap: 8 });
  actSection.appendChild(createText({ text: '액션', size: 14, weight: 600, color: COLORS.neutral900 }));

  const actionBtns = [
    { label: '💬 메시지 전송', bg: COLORS.primary, color: COLORS.white },
    { label: '✅ 해결 처리', bg: COLORS.success, color: COLORS.white },
    { label: '🔔 재에스컬레이션', bg: COLORS.white, color: COLORS.neutral700, stroke: COLORS.neutral300 },
  ];
  for (const ab of actionBtns) {
    const btn = createAutoLayoutFrame({
      name: `Action - ${ab.label}`,
      direction: 'HORIZONTAL',
      width: 'FILL',
      height: 40,
      fill: ab.bg,
      cornerRadius: RADIUS.sm,
      stroke: ab.stroke,
    });
    btn.primaryAxisAlignItems = 'CENTER';
    btn.counterAxisAlignItems = 'CENTER';
    btn.appendChild(createText({ text: ab.label, size: 14, weight: 600, color: ab.color }));
    actSection.appendChild(btn);
  }
  infoPanel.appendChild(actSection);

  content.appendChild(infoPanel);

  finalize(root);
  return [root];
}

// ── Helper: Build message bubbles ──

function buildMessage(sender: string, text: string, time: string, bg: string, stroke: string, isAdmin = false): FrameNode {
  const row = createAutoLayoutFrame({ name: `${sender} Row`, direction: 'HORIZONTAL', gap: 8, width: 'FILL' });
  row.counterAxisAlignItems = 'MIN';

  const avatarColor = isAdmin ? COLORS.successLight : COLORS.primaryLight;
  row.appendChild(createCircle(`${sender} Avatar`, 28, avatarColor));

  const col = createAutoLayoutFrame({ name: `${sender} Col`, direction: 'VERTICAL', gap: 2 });

  if (isAdmin) {
    col.appendChild(createBadge('상담사', COLORS.successLight, '#065F46'));
  }

  const bubble = createAutoLayoutFrame({
    name: `${sender} Bubble`,
    direction: 'VERTICAL',
    padding: SPACING.md,
    gap: 4,
    fill: bg,
    cornerRadius: RADIUS.lg,
    stroke: stroke,
  });
  bubble.resize(340, bubble.height);
  bubble.layoutSizingHorizontal = 'FIXED';
  bubble.appendChild(createText({ text, size: 14, color: COLORS.neutral900, width: 316 }));
  bubble.appendChild(createText({ text: time, size: 12, color: COLORS.neutral500 }));
  col.appendChild(bubble);
  row.appendChild(col);

  return row;
}

function buildCustomerMessage(text: string, time: string): FrameNode {
  const row = createAutoLayoutFrame({ name: 'Customer Row', direction: 'HORIZONTAL', gap: 8, width: 'FILL' });
  row.primaryAxisAlignItems = 'MAX';

  const bubble = createAutoLayoutFrame({
    name: 'Customer Bubble',
    direction: 'VERTICAL',
    padding: SPACING.md,
    gap: 4,
    fill: COLORS.primary,
    cornerRadius: RADIUS.lg,
  });
  bubble.resize(300, bubble.height);
  bubble.layoutSizingHorizontal = 'FIXED';
  bubble.appendChild(createText({ text, size: 14, color: COLORS.white, width: 276 }));
  bubble.appendChild(createText({ text: time, size: 12, color: '#93C5FD' }));
  row.appendChild(bubble);

  return row;
}
