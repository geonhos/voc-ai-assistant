import { COLORS, RADIUS, SPACING, CONVERSATION_STATUS } from '../utils/constants';
import {
  createAutoLayoutFrame, createText, createPlaceholder,
  createBadge, buildAppShell, finalize, solidPaint,
} from '../utils/helpers';

export async function generateDashboard(): Promise<FrameNode[]> {
  const { root, content } = buildAppShell('Dashboard');

  // ── KPI Cards Row ──
  const kpiRow = createAutoLayoutFrame({
    name: 'KPI Cards',
    direction: 'HORIZONTAL',
    width: 'FILL',
    gap: 16,
  });

  const kpis = [
    { label: '총 대화', value: '1,247', change: '↑ 12%', changeColor: COLORS.success, icon: '💬' },
    { label: 'AI 해결률', value: '73%', change: '↑ 5%', changeColor: COLORS.success, icon: '🤖' },
    { label: '평균 응답 시간', value: '2.3s', change: '↓ 0.5s', changeColor: COLORS.success, icon: '⚡' },
    { label: '에스컬레이션', value: '342', change: '↓ 8%', changeColor: COLORS.danger, icon: '🔔' },
  ];

  for (const kpi of kpis) {
    const card = createAutoLayoutFrame({
      name: `KPI - ${kpi.label}`,
      direction: 'VERTICAL',
      width: 'FILL',
      padding: SPACING.base,
      gap: 8,
      fill: COLORS.white,
      cornerRadius: RADIUS.md,
      stroke: COLORS.neutral300,
    });

    const cardHeader = createAutoLayoutFrame({ name: 'Card Header', direction: 'HORIZONTAL', width: 'FILL', gap: 8 });
    cardHeader.primaryAxisAlignItems = 'SPACE_BETWEEN';
    cardHeader.appendChild(createText({ text: kpi.label, size: 13, weight: 500, color: COLORS.neutral500 }));
    cardHeader.appendChild(createText({ text: kpi.icon, size: 18 }));
    card.appendChild(cardHeader);

    card.appendChild(createText({ text: kpi.value, size: 32, weight: 700, color: COLORS.neutral900 }));

    const changeRow = createAutoLayoutFrame({ name: 'Change', direction: 'HORIZONTAL', gap: 4 });
    changeRow.counterAxisAlignItems = 'CENTER';
    changeRow.appendChild(createText({ text: kpi.change, size: 12, weight: 500, color: kpi.changeColor }));
    changeRow.appendChild(createText({ text: '전일 대비', size: 12, color: COLORS.neutral500 }));
    card.appendChild(changeRow);

    kpiRow.appendChild(card);
  }
  content.appendChild(kpiRow);

  // ── Charts Row ──
  const chartsRow = createAutoLayoutFrame({
    name: 'Charts Row',
    direction: 'HORIZONTAL',
    width: 'FILL',
    gap: 16,
  });

  // Trend chart
  const trendChart = createAutoLayoutFrame({
    name: 'Trend Chart',
    direction: 'VERTICAL',
    width: 'FILL',
    padding: SPACING.base,
    gap: 12,
    fill: COLORS.white,
    cornerRadius: RADIUS.md,
    stroke: COLORS.neutral300,
  });
  trendChart.appendChild(createText({ text: '일별 추이', size: 16, weight: 600, color: COLORS.neutral900 }));

  const legendRow = createAutoLayoutFrame({ name: 'Legend', direction: 'HORIZONTAL', gap: 16 });
  const legend1 = createAutoLayoutFrame({ name: 'L1', direction: 'HORIZONTAL', gap: 6 });
  legend1.counterAxisAlignItems = 'CENTER';
  const l1dot = figma.createRectangle(); l1dot.resize(12, 3); l1dot.fills = [solidPaint(COLORS.primary)]; l1dot.cornerRadius = 2;
  legend1.appendChild(l1dot);
  legend1.appendChild(createText({ text: '총 대화', size: 12, color: COLORS.neutral500 }));
  legendRow.appendChild(legend1);

  const legend2 = createAutoLayoutFrame({ name: 'L2', direction: 'HORIZONTAL', gap: 6 });
  legend2.counterAxisAlignItems = 'CENTER';
  const l2dot = figma.createRectangle(); l2dot.resize(12, 3); l2dot.fills = [solidPaint(COLORS.danger)]; l2dot.cornerRadius = 2;
  legend2.appendChild(l2dot);
  legend2.appendChild(createText({ text: '에스컬레이션', size: 12, color: COLORS.neutral500 }));
  legendRow.appendChild(legend2);
  trendChart.appendChild(legendRow);

  trendChart.appendChild(createPlaceholder('Line Chart', 500, 200, COLORS.neutral100));
  chartsRow.appendChild(trendChart);

  // Category distribution
  const catChart = createAutoLayoutFrame({
    name: 'Category Chart',
    direction: 'VERTICAL',
    width: 360,
    padding: SPACING.base,
    gap: 12,
    fill: COLORS.white,
    cornerRadius: RADIUS.md,
    stroke: COLORS.neutral300,
  });
  catChart.appendChild(createText({ text: '카테고리 분포', size: 16, weight: 600, color: COLORS.neutral900 }));
  catChart.appendChild(createPlaceholder('Donut Chart', 328, 180, COLORS.neutral100));

  const catItems = [
    { label: '결제', pct: '35%', color: COLORS.primary },
    { label: '배송', pct: '25%', color: COLORS.success },
    { label: '기술', pct: '20%', color: COLORS.warning },
    { label: '기타', pct: '20%', color: COLORS.neutral500 },
  ];
  for (const item of catItems) {
    const row = createAutoLayoutFrame({ name: `Cat - ${item.label}`, direction: 'HORIZONTAL', gap: 8, width: 'FILL' });
    row.primaryAxisAlignItems = 'SPACE_BETWEEN';
    row.counterAxisAlignItems = 'CENTER';
    const left = createAutoLayoutFrame({ name: 'Left', direction: 'HORIZONTAL', gap: 6 });
    left.counterAxisAlignItems = 'CENTER';
    const colorDot = figma.createRectangle(); colorDot.resize(10, 10); colorDot.fills = [solidPaint(item.color)]; colorDot.cornerRadius = 2;
    left.appendChild(colorDot);
    left.appendChild(createText({ text: item.label, size: 13, color: COLORS.neutral700 }));
    row.appendChild(left);
    row.appendChild(createText({ text: item.pct, size: 13, weight: 600, color: COLORS.neutral900 }));
    catChart.appendChild(row);
  }
  chartsRow.appendChild(catChart);
  content.appendChild(chartsRow);

  // ── Recent Escalations ──
  const escSection = createAutoLayoutFrame({
    name: 'Recent Escalations',
    direction: 'VERTICAL',
    width: 'FILL',
    padding: SPACING.base,
    gap: 12,
    fill: COLORS.white,
    cornerRadius: RADIUS.md,
    stroke: COLORS.neutral300,
  });

  const escHeader = createAutoLayoutFrame({ name: 'Section Header', direction: 'HORIZONTAL', width: 'FILL' });
  escHeader.primaryAxisAlignItems = 'SPACE_BETWEEN';
  escHeader.counterAxisAlignItems = 'CENTER';
  escHeader.appendChild(createText({ text: '최근 에스컬레이션', size: 16, weight: 600, color: COLORS.neutral900 }));
  escHeader.appendChild(createText({ text: '전체 보기 →', size: 13, weight: 500, color: COLORS.primary }));
  escSection.appendChild(escHeader);

  const escalations = [
    { name: '홍길동', topic: '결제 오류 — PG 타임아웃 의심', time: '5분 전', status: 'ESCALATED' },
    { name: '김철수', topic: '배송 지연 — 3일 초과', time: '12분 전', status: 'ESCALATED' },
    { name: '이영희', topic: '로그인 불가 — 비밀번호 재설정 실패', time: '25분 전', status: 'ACTIVE' },
  ];

  for (const esc of escalations) {
    const row = createAutoLayoutFrame({
      name: `Esc - ${esc.name}`,
      direction: 'HORIZONTAL',
      width: 'FILL',
      padding: { top: 10, right: 12, bottom: 10, left: 12 },
      gap: 12,
      cornerRadius: RADIUS.sm,
    });
    row.counterAxisAlignItems = 'CENTER';
    row.primaryAxisAlignItems = 'SPACE_BETWEEN';

    const left = createAutoLayoutFrame({ name: 'Left', direction: 'HORIZONTAL', gap: 12 });
    left.counterAxisAlignItems = 'CENTER';
    left.appendChild(createText({ text: esc.name, size: 14, weight: 600, color: COLORS.neutral900 }));
    left.appendChild(createText({ text: esc.topic, size: 13, color: COLORS.neutral700 }));
    row.appendChild(left);

    const right = createAutoLayoutFrame({ name: 'Right', direction: 'HORIZONTAL', gap: 12 });
    right.counterAxisAlignItems = 'CENTER';
    const st = CONVERSATION_STATUS[esc.status];
    right.appendChild(createBadge(st.label, st.bg, st.text));
    right.appendChild(createText({ text: esc.time, size: 12, color: COLORS.neutral500 }));
    row.appendChild(right);

    escSection.appendChild(row);
  }
  content.appendChild(escSection);

  finalize(root);
  return [root];
}
