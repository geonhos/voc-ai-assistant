import { COLORS, RADIUS, SPACING, CONVERSATION_STATUS } from '../utils/constants';
import {
  createAutoLayoutFrame, createText, createBadge,
  buildAppShell, finalize,
} from '../utils/helpers';

export async function generateConversationList(): Promise<FrameNode[]> {
  const { root, content } = buildAppShell('대화 관리');

  // ── Filter Bar ──
  const filterBar = createAutoLayoutFrame({
    name: 'Filter Bar',
    direction: 'HORIZONTAL',
    width: 'FILL',
    gap: 12,
  });
  filterBar.counterAxisAlignItems = 'CENTER';

  const searchInput = createAutoLayoutFrame({
    name: 'Search Input',
    direction: 'HORIZONTAL',
    width: 'FILL',
    height: 40,
    padding: { top: 8, right: 14, bottom: 8, left: 14 },
    fill: COLORS.white,
    cornerRadius: RADIUS.sm,
    stroke: COLORS.neutral300,
  });
  searchInput.counterAxisAlignItems = 'CENTER';
  searchInput.appendChild(createText({ text: '🔍  고객명, 이메일, 대화 내용 검색...', size: 14, color: COLORS.neutral500 }));
  filterBar.appendChild(searchInput);

  const filters = ['상태 ▼', '기간 ▼', 'AI 해결 ▼'];
  for (const f of filters) {
    const btn = createAutoLayoutFrame({
      name: `Filter - ${f}`,
      direction: 'HORIZONTAL',
      height: 40,
      padding: { top: 8, right: 14, bottom: 8, left: 14 },
      fill: COLORS.white,
      cornerRadius: RADIUS.sm,
      stroke: COLORS.neutral300,
    });
    btn.counterAxisAlignItems = 'CENTER';
    btn.appendChild(createText({ text: f, size: 13, weight: 500, color: COLORS.neutral700 }));
    filterBar.appendChild(btn);
  }
  content.appendChild(filterBar);

  // ── Table ──
  const table = createAutoLayoutFrame({
    name: 'Conversation Table',
    direction: 'VERTICAL',
    width: 'FILL',
    fill: COLORS.white,
    cornerRadius: RADIUS.md,
    stroke: COLORS.neutral300,
  });

  // Header row
  const headerRow = createAutoLayoutFrame({
    name: 'Table Header',
    direction: 'HORIZONTAL',
    width: 'FILL',
    height: 44,
    fill: COLORS.neutral50,
    padding: { top: 0, right: 16, bottom: 0, left: 16 },
    gap: 0,
  });
  headerRow.counterAxisAlignItems = 'CENTER';

  const colWidths = [240, 280, 100, 100, 80, 80];
  const colNames = ['고객', '주제', '상태', '시간', 'AI 해결', '메시지'];
  for (let i = 0; i < colNames.length; i++) {
    const col = createAutoLayoutFrame({ name: `Col - ${colNames[i]}`, direction: 'HORIZONTAL', width: colWidths[i], height: 'FILL' });
    col.counterAxisAlignItems = 'CENTER';
    col.appendChild(createText({ text: colNames[i], size: 12, weight: 600, color: COLORS.neutral500 }));
    headerRow.appendChild(col);
  }
  table.appendChild(headerRow);

  // Data rows
  const rows = [
    { name: '홍길동', email: 'hong@email.com', topic: '결제 오류 — 카드 결제 시 타임아웃 발생', status: 'ESCALATED', time: '5분 전', ai: '❌', msgs: '8' },
    { name: '김철수', email: 'kim@email.com', topic: '배송 문의 — 주문 후 3일 경과, 배송 시작 안됨', status: 'RESOLVED', time: '1시간 전', ai: '✅', msgs: '4' },
    { name: '이영희', email: 'lee@email.com', topic: '로그인 불가 — 비밀번호 재설정 이메일 미수신', status: 'ACTIVE', time: '2시간 전', ai: '❌', msgs: '12' },
    { name: '박민수', email: 'park@email.com', topic: '환불 요청 — 상품 불량으로 환불 처리 요청', status: 'RESOLVED', time: '3시간 전', ai: '✅', msgs: '6' },
    { name: '정수진', email: 'jung@email.com', topic: '쿠폰 적용 안됨 — 할인 코드 입력 시 오류', status: 'CLOSED', time: '5시간 전', ai: '✅', msgs: '3' },
    { name: '최동혁', email: 'choi@email.com', topic: '상품 문의 — 재고 확인 및 입고 일정', status: 'ACTIVE', time: '6시간 전', ai: '❌', msgs: '10' },
    { name: '강서연', email: 'kang@email.com', topic: '회원 탈퇴 — 계정 삭제 절차 문의', status: 'RESOLVED', time: '1일 전', ai: '✅', msgs: '5' },
  ];

  for (const row of rows) {
    const dataRow = createAutoLayoutFrame({
      name: `Row - ${row.name}`,
      direction: 'HORIZONTAL',
      width: 'FILL',
      height: 56,
      padding: { top: 0, right: 16, bottom: 0, left: 16 },
      stroke: COLORS.neutral100,
    });
    dataRow.counterAxisAlignItems = 'CENTER';

    // Customer
    const custCol = createAutoLayoutFrame({ name: 'Customer', direction: 'VERTICAL', width: 240, gap: 2 });
    custCol.appendChild(createText({ text: row.name, size: 14, weight: 500, color: COLORS.neutral900 }));
    custCol.appendChild(createText({ text: row.email, size: 12, color: COLORS.neutral500 }));
    dataRow.appendChild(custCol);

    // Topic
    const topicCol = createAutoLayoutFrame({ name: 'Topic', direction: 'HORIZONTAL', width: 280 });
    topicCol.counterAxisAlignItems = 'CENTER';
    topicCol.appendChild(createText({ text: row.topic, size: 13, color: COLORS.neutral700, width: 270 }));
    dataRow.appendChild(topicCol);

    // Status
    const statusCol = createAutoLayoutFrame({ name: 'Status', direction: 'HORIZONTAL', width: 100 });
    statusCol.counterAxisAlignItems = 'CENTER';
    const st = CONVERSATION_STATUS[row.status];
    statusCol.appendChild(createBadge(st.label, st.bg, st.text));
    dataRow.appendChild(statusCol);

    // Time
    const timeCol = createAutoLayoutFrame({ name: 'Time', direction: 'HORIZONTAL', width: 100 });
    timeCol.counterAxisAlignItems = 'CENTER';
    timeCol.appendChild(createText({ text: row.time, size: 13, color: COLORS.neutral500 }));
    dataRow.appendChild(timeCol);

    // AI
    const aiCol = createAutoLayoutFrame({ name: 'AI', direction: 'HORIZONTAL', width: 80 });
    aiCol.counterAxisAlignItems = 'CENTER';
    aiCol.primaryAxisAlignItems = 'CENTER';
    aiCol.appendChild(createText({ text: row.ai, size: 16 }));
    dataRow.appendChild(aiCol);

    // Messages
    const msgCol = createAutoLayoutFrame({ name: 'Msgs', direction: 'HORIZONTAL', width: 80 });
    msgCol.counterAxisAlignItems = 'CENTER';
    msgCol.primaryAxisAlignItems = 'CENTER';
    msgCol.appendChild(createText({ text: row.msgs, size: 13, weight: 500, color: COLORS.neutral700 }));
    dataRow.appendChild(msgCol);

    table.appendChild(dataRow);
  }
  content.appendChild(table);

  // ── Pagination ──
  const pagination = createAutoLayoutFrame({
    name: 'Pagination',
    direction: 'HORIZONTAL',
    width: 'FILL',
    gap: 8,
  });
  pagination.primaryAxisAlignItems = 'CENTER';
  pagination.counterAxisAlignItems = 'CENTER';

  pagination.appendChild(createText({ text: '총 342건', size: 13, color: COLORS.neutral500 }));

  const pageNums = ['< ', '1', '2', '3', '...', '18', ' >'];
  for (const p of pageNums) {
    const pageBtn = createAutoLayoutFrame({
      name: `Page ${p}`,
      direction: 'HORIZONTAL',
      width: 32,
      height: 32,
      fill: p === '1' ? COLORS.primary : COLORS.white,
      cornerRadius: RADIUS.sm,
      stroke: p === '1' ? undefined : COLORS.neutral300,
    });
    pageBtn.primaryAxisAlignItems = 'CENTER';
    pageBtn.counterAxisAlignItems = 'CENTER';
    pageBtn.appendChild(createText({ text: p, size: 13, weight: 500, color: p === '1' ? COLORS.white : COLORS.neutral700 }));
    pagination.appendChild(pageBtn);
  }
  content.appendChild(pagination);

  finalize(root);
  return [root];
}
