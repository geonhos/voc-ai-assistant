import { COLORS, RADIUS, SPACING } from '../utils/constants';
import {
  createAutoLayoutFrame, createText, createBadge,
  buildAppShell, finalize, solidPaint,
} from '../utils/helpers';

export async function generateKnowledgeBase(): Promise<FrameNode[]> {
  const { root, content } = buildAppShell('Knowledge Base');

  // ── Header Row ──
  const headerRow = createAutoLayoutFrame({
    name: 'Page Header',
    direction: 'HORIZONTAL',
    width: 'FILL',
  });
  headerRow.primaryAxisAlignItems = 'SPACE_BETWEEN';
  headerRow.counterAxisAlignItems = 'CENTER';
  headerRow.appendChild(createText({ text: 'Knowledge Base', size: 20, weight: 600, color: COLORS.neutral900 }));

  const addBtn = createAutoLayoutFrame({
    name: 'Add Button',
    direction: 'HORIZONTAL',
    height: 40,
    padding: { top: 8, right: 16, bottom: 8, left: 16 },
    fill: COLORS.primary,
    cornerRadius: RADIUS.sm,
    gap: 6,
  });
  addBtn.counterAxisAlignItems = 'CENTER';
  addBtn.appendChild(createText({ text: '+ 새 문서', size: 14, weight: 600, color: COLORS.white }));
  headerRow.appendChild(addBtn);
  content.appendChild(headerRow);

  // ── Filter Bar ──
  const filterBar = createAutoLayoutFrame({
    name: 'Filter Bar',
    direction: 'HORIZONTAL',
    width: 'FILL',
    gap: 12,
  });
  filterBar.counterAxisAlignItems = 'CENTER';

  const searchInput = createAutoLayoutFrame({
    name: 'Search',
    direction: 'HORIZONTAL',
    width: 'FILL',
    height: 40,
    padding: { top: 8, right: 14, bottom: 8, left: 14 },
    fill: COLORS.white,
    cornerRadius: RADIUS.sm,
    stroke: COLORS.neutral300,
  });
  searchInput.counterAxisAlignItems = 'CENTER';
  searchInput.appendChild(createText({ text: '🔍  문서 검색...', size: 14, color: COLORS.neutral500 }));
  filterBar.appendChild(searchInput);

  const catFilter = createAutoLayoutFrame({
    name: 'Category Filter',
    direction: 'HORIZONTAL',
    height: 40,
    padding: { top: 8, right: 14, bottom: 8, left: 14 },
    fill: COLORS.white,
    cornerRadius: RADIUS.sm,
    stroke: COLORS.neutral300,
  });
  catFilter.counterAxisAlignItems = 'CENTER';
  catFilter.appendChild(createText({ text: '카테고리 ▼', size: 13, weight: 500, color: COLORS.neutral700 }));
  filterBar.appendChild(catFilter);
  content.appendChild(filterBar);

  // ── Article Cards ──
  const articles = [
    { title: '결제 실패 시 대처 방법', category: '결제', tags: ['결제', 'PG', '오류'], active: true, updated: '2026-03-10' },
    { title: '배송 지연 안내 가이드', category: '배송', tags: ['배송', '택배', '지연'], active: true, updated: '2026-03-08' },
    { title: '비밀번호 재설정 절차', category: '계정', tags: ['계정', '비밀번호', '로그인'], active: false, updated: '2026-03-05' },
    { title: '환불 및 교환 정책 안내', category: '주문', tags: ['환불', '교환', '반품'], active: true, updated: '2026-03-03' },
    { title: '쿠폰 사용 방법 및 주의사항', category: '프로모션', tags: ['쿠폰', '할인', '적용'], active: true, updated: '2026-02-28' },
  ];

  const cardList = createAutoLayoutFrame({
    name: 'Article List',
    direction: 'VERTICAL',
    width: 'FILL',
    gap: 0,
    fill: COLORS.white,
    cornerRadius: RADIUS.md,
    stroke: COLORS.neutral300,
  });

  for (const article of articles) {
    const card = createAutoLayoutFrame({
      name: `Article - ${article.title}`,
      direction: 'HORIZONTAL',
      width: 'FILL',
      padding: SPACING.base,
      gap: 12,
      stroke: COLORS.neutral100,
    });
    card.counterAxisAlignItems = 'CENTER';
    card.primaryAxisAlignItems = 'SPACE_BETWEEN';

    // Left content
    const leftContent = createAutoLayoutFrame({ name: 'Left', direction: 'VERTICAL', width: 'FILL', gap: 6 });

    const titleRow = createAutoLayoutFrame({ name: 'Title Row', direction: 'HORIZONTAL', gap: 8 });
    titleRow.counterAxisAlignItems = 'CENTER';
    titleRow.appendChild(createText({ text: '📄', size: 16 }));
    titleRow.appendChild(createText({ text: article.title, size: 14, weight: 600, color: COLORS.neutral900 }));
    leftContent.appendChild(titleRow);

    const metaRow = createAutoLayoutFrame({ name: 'Meta', direction: 'HORIZONTAL', gap: 8 });
    metaRow.counterAxisAlignItems = 'CENTER';
    metaRow.appendChild(createBadge(article.category, COLORS.primaryLight, COLORS.primaryDark));

    for (const tag of article.tags) {
      metaRow.appendChild(createBadge(tag, COLORS.neutral100, COLORS.neutral500));
    }

    metaRow.appendChild(createText({ text: `|  수정일: ${article.updated}`, size: 12, color: COLORS.neutral500 }));
    leftContent.appendChild(metaRow);

    card.appendChild(leftContent);

    // Right — status toggle
    const statusBadge = createBadge(
      article.active ? '활성 ✅' : '비활성 ❌',
      article.active ? COLORS.successLight : COLORS.neutral100,
      article.active ? '#065F46' : COLORS.neutral500,
    );
    card.appendChild(statusBadge);

    cardList.appendChild(card);
  }
  content.appendChild(cardList);

  // ── Edit Modal (overlay) ──
  const modal = createAutoLayoutFrame({
    name: 'KB Edit Modal (Overlay)',
    direction: 'VERTICAL',
    width: 560,
    padding: SPACING.lg,
    gap: 16,
    fill: COLORS.white,
    cornerRadius: RADIUS.lg,
  });
  modal.strokes = [solidPaint(COLORS.neutral300)];
  modal.strokeWeight = 1;
  modal.effects = [{
    type: 'DROP_SHADOW',
    color: { r: 0, g: 0, b: 0, a: 0.15 },
    offset: { x: 0, y: 10 },
    radius: 25,
    spread: 0,
    visible: true,
    blendMode: 'NORMAL',
  }];

  modal.appendChild(createText({ text: '📝 Knowledge Base 문서 편집', size: 18, weight: 600, color: COLORS.neutral900 }));

  // Title field
  const titleGroup = createAutoLayoutFrame({ name: 'Title Group', direction: 'VERTICAL', gap: 6, width: 'FILL' });
  titleGroup.appendChild(createText({ text: '제목', size: 13, weight: 500, color: COLORS.neutral700 }));
  const titleInput = createAutoLayoutFrame({
    name: 'Title Input',
    direction: 'HORIZONTAL',
    width: 'FILL',
    height: 40,
    padding: { top: 8, right: 14, bottom: 8, left: 14 },
    fill: COLORS.neutral50,
    cornerRadius: RADIUS.sm,
    stroke: COLORS.neutral300,
  });
  titleInput.counterAxisAlignItems = 'CENTER';
  titleInput.appendChild(createText({ text: '결제 실패 시 대처 방법', size: 14, color: COLORS.neutral900 }));
  titleGroup.appendChild(titleInput);
  modal.appendChild(titleGroup);

  // Category + Tags row
  const catTagRow = createAutoLayoutFrame({ name: 'Cat Tag Row', direction: 'HORIZONTAL', width: 'FILL', gap: 12 });

  const catGroup = createAutoLayoutFrame({ name: 'Category', direction: 'VERTICAL', gap: 6, width: 'FILL' });
  catGroup.appendChild(createText({ text: '카테고리', size: 13, weight: 500, color: COLORS.neutral700 }));
  const catInput = createAutoLayoutFrame({
    name: 'Cat Input',
    direction: 'HORIZONTAL',
    width: 'FILL',
    height: 40,
    padding: { top: 8, right: 14, bottom: 8, left: 14 },
    fill: COLORS.neutral50,
    cornerRadius: RADIUS.sm,
    stroke: COLORS.neutral300,
  });
  catInput.counterAxisAlignItems = 'CENTER';
  catInput.appendChild(createText({ text: '결제 ▼', size: 14, color: COLORS.neutral900 }));
  catGroup.appendChild(catInput);
  catTagRow.appendChild(catGroup);

  const tagGroup = createAutoLayoutFrame({ name: 'Tags', direction: 'VERTICAL', gap: 6, width: 'FILL' });
  tagGroup.appendChild(createText({ text: '태그', size: 13, weight: 500, color: COLORS.neutral700 }));
  const tagRow = createAutoLayoutFrame({ name: 'Tags Row', direction: 'HORIZONTAL', gap: 6 });
  tagRow.appendChild(createBadge('결제', COLORS.primaryLight, COLORS.primaryDark));
  tagRow.appendChild(createBadge('오류', COLORS.primaryLight, COLORS.primaryDark));
  tagRow.appendChild(createBadge('PG', COLORS.primaryLight, COLORS.primaryDark));
  tagRow.appendChild(createBadge('+ 추가', COLORS.neutral100, COLORS.neutral500));
  tagGroup.appendChild(tagRow);
  catTagRow.appendChild(tagGroup);
  modal.appendChild(catTagRow);

  // Content field
  const contentGroup = createAutoLayoutFrame({ name: 'Content Group', direction: 'VERTICAL', gap: 6, width: 'FILL' });
  contentGroup.appendChild(createText({ text: '내용', size: 13, weight: 500, color: COLORS.neutral700 }));
  const contentInput = createAutoLayoutFrame({
    name: 'Content Editor',
    direction: 'VERTICAL',
    width: 'FILL',
    height: 180,
    padding: 14,
    fill: COLORS.neutral50,
    cornerRadius: RADIUS.sm,
    stroke: COLORS.neutral300,
    gap: 8,
  });
  contentInput.appendChild(createText({ text: '## 결제 실패 원인\n1. 카드 한도 초과\n2. 네트워크 오류\n3. PG사 점검 시간\n\n## 해결 방법\n- 다른 결제 수단 시도\n- 카드사 확인\n- 10분 후 재시도', size: 13, color: COLORS.neutral700, width: 484 }));
  contentGroup.appendChild(contentInput);
  modal.appendChild(contentGroup);

  // Active toggle
  const toggleRow = createAutoLayoutFrame({ name: 'Toggle Row', direction: 'HORIZONTAL', width: 'FILL', gap: 8 });
  toggleRow.counterAxisAlignItems = 'CENTER';
  toggleRow.appendChild(createText({ text: '활성 상태:', size: 13, weight: 500, color: COLORS.neutral700 }));
  const toggleBg = createAutoLayoutFrame({
    name: 'Toggle',
    direction: 'HORIZONTAL',
    width: 44,
    height: 24,
    fill: COLORS.success,
    cornerRadius: RADIUS.full,
    padding: { top: 2, right: 2, bottom: 2, left: 22 },
  });
  const toggleKnob = figma.createEllipse();
  toggleKnob.resize(20, 20);
  toggleKnob.fills = [solidPaint(COLORS.white)];
  toggleBg.appendChild(toggleKnob);
  toggleRow.appendChild(toggleBg);
  toggleRow.appendChild(createText({ text: 'ON', size: 13, weight: 600, color: COLORS.success }));
  modal.appendChild(toggleRow);

  // Info note
  const infoNote = createAutoLayoutFrame({
    name: 'Info Note',
    direction: 'HORIZONTAL',
    width: 'FILL',
    padding: SPACING.md,
    gap: 6,
    fill: COLORS.primaryLight,
    cornerRadius: RADIUS.sm,
  });
  infoNote.counterAxisAlignItems = 'CENTER';
  infoNote.appendChild(createText({ text: 'ℹ️', size: 14 }));
  infoNote.appendChild(createText({ text: '저장 시 자동으로 벡터 임베딩이 생성되어 AI 답변에 반영됩니다', size: 12, color: COLORS.primaryDark, width: 460 }));
  modal.appendChild(infoNote);

  // Footer buttons
  const footerBtns = createAutoLayoutFrame({ name: 'Footer', direction: 'HORIZONTAL', width: 'FILL', gap: 8 });
  footerBtns.primaryAxisAlignItems = 'MAX';

  const cancelBtn = createAutoLayoutFrame({
    name: 'Cancel',
    direction: 'HORIZONTAL',
    height: 40,
    padding: { top: 8, right: 20, bottom: 8, left: 20 },
    fill: COLORS.white,
    cornerRadius: RADIUS.sm,
    stroke: COLORS.neutral300,
  });
  cancelBtn.counterAxisAlignItems = 'CENTER';
  cancelBtn.appendChild(createText({ text: '취소', size: 14, weight: 500, color: COLORS.neutral700 }));

  const saveBtn = createAutoLayoutFrame({
    name: 'Save',
    direction: 'HORIZONTAL',
    height: 40,
    padding: { top: 8, right: 20, bottom: 8, left: 20 },
    fill: COLORS.primary,
    cornerRadius: RADIUS.sm,
  });
  saveBtn.counterAxisAlignItems = 'CENTER';
  saveBtn.appendChild(createText({ text: '저장하기', size: 14, weight: 600, color: COLORS.white }));

  footerBtns.appendChild(cancelBtn);
  footerBtns.appendChild(saveBtn);
  modal.appendChild(footerBtns);

  finalize(root);
  finalize(modal);
  return [root, modal];
}
