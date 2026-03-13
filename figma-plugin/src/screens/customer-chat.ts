import { COLORS, RADIUS, SPACING, CHAT_WIDTH, CHAT_HEIGHT } from '../utils/constants';
import {
  createAutoLayoutFrame, createText, createCircle,
  createPlaceholder, createBadge, solidPaint, finalize,
} from '../utils/helpers';

export async function generateCustomerChat(): Promise<FrameNode[]> {
  const root = createAutoLayoutFrame({
    name: 'Customer Chat (/chat)',
    direction: 'VERTICAL',
    width: CHAT_WIDTH,
    height: CHAT_HEIGHT,
    fill: COLORS.white,
    cornerRadius: RADIUS.xl,
  });
  root.strokes = [solidPaint(COLORS.neutral300)];
  root.strokeWeight = 1;

  // ── Header ──
  const header = createAutoLayoutFrame({
    name: 'Chat Header',
    direction: 'HORIZONTAL',
    width: 'FILL',
    height: 64,
    fill: COLORS.white,
    padding: { top: 12, right: 16, bottom: 12, left: 16 },
    gap: 12,
    stroke: COLORS.neutral300,
  });
  header.counterAxisAlignItems = 'CENTER';

  const avatar = createCircle('AI Avatar', 40, COLORS.primaryLight);
  header.appendChild(avatar);

  const headerInfo = createAutoLayoutFrame({ name: 'Header Info', direction: 'VERTICAL', gap: 2 });
  const title = createText({ text: 'AI 상담 도우미', size: 16, weight: 600, color: COLORS.neutral900 });
  const statusRow = createAutoLayoutFrame({ name: 'Status', direction: 'HORIZONTAL', gap: 6 });
  statusRow.counterAxisAlignItems = 'CENTER';
  const dot = createCircle('Online Dot', 8, COLORS.success);
  const statusText = createText({ text: '온라인', size: 12, color: COLORS.success });
  statusRow.appendChild(dot);
  statusRow.appendChild(statusText);
  headerInfo.appendChild(title);
  headerInfo.appendChild(statusRow);
  header.appendChild(headerInfo);

  root.appendChild(header);

  // ── Message Area ──
  const messageArea = createAutoLayoutFrame({
    name: 'Message Area',
    direction: 'VERTICAL',
    width: 'FILL',
    height: 'FILL',
    fill: COLORS.neutral50,
    padding: 16,
    gap: 16,
  });

  // Welcome message (AI)
  const welcomeRow = createAutoLayoutFrame({ name: 'AI Message Row', direction: 'HORIZONTAL', gap: 8, width: 'FILL' });
  welcomeRow.counterAxisAlignItems = 'MIN';
  const aiAvatar1 = createCircle('AI Avatar', 28, COLORS.primaryLight);
  welcomeRow.appendChild(aiAvatar1);

  const welcomeBubble = createAutoLayoutFrame({
    name: 'AI Bubble',
    direction: 'VERTICAL',
    padding: SPACING.md,
    gap: 4,
    fill: COLORS.white,
    cornerRadius: RADIUS.lg,
    stroke: COLORS.neutral300,
  });
  welcomeBubble.resize(280, welcomeBubble.height);
  welcomeBubble.layoutSizingHorizontal = 'FIXED';
  const welcomeText = createText({ text: '안녕하세요! AI 상담 도우미입니다.\n어떤 문제가 있으신가요?', size: 14, color: COLORS.neutral900, width: 256 });
  const welcomeTime = createText({ text: '오후 2:30', size: 12, color: COLORS.neutral500 });
  welcomeBubble.appendChild(welcomeText);
  welcomeBubble.appendChild(welcomeTime);
  welcomeRow.appendChild(welcomeBubble);
  messageArea.appendChild(welcomeRow);

  // Quick action buttons
  const quickActions = createAutoLayoutFrame({ name: 'Quick Actions', direction: 'HORIZONTAL', gap: 8, padding: { top: 0, right: 0, bottom: 0, left: 36 } });
  const actions = ['결제 문제', '배송 문의', '기타 문의'];
  for (const action of actions) {
    const btn = createAutoLayoutFrame({
      name: `Quick - ${action}`,
      direction: 'HORIZONTAL',
      padding: { top: 8, right: 14, bottom: 8, left: 14 },
      fill: COLORS.white,
      cornerRadius: RADIUS.full,
      stroke: COLORS.primary,
    });
    const btnText = createText({ text: action, size: 13, weight: 500, color: COLORS.primary });
    btn.appendChild(btnText);
    quickActions.appendChild(btn);
  }
  messageArea.appendChild(quickActions);

  // Customer message
  const customerRow = createAutoLayoutFrame({ name: 'Customer Message Row', direction: 'HORIZONTAL', gap: 8, width: 'FILL' });
  customerRow.primaryAxisAlignItems = 'MAX';

  const customerBubble = createAutoLayoutFrame({
    name: 'Customer Bubble',
    direction: 'VERTICAL',
    padding: SPACING.md,
    gap: 4,
    fill: COLORS.primary,
    cornerRadius: RADIUS.lg,
  });
  customerBubble.resize(260, customerBubble.height);
  customerBubble.layoutSizingHorizontal = 'FIXED';
  const customerText = createText({ text: '결제가 안 돼요. 카드 결제 시 오류가 발생합니다.', size: 14, color: COLORS.white, width: 236 });
  const customerTime = createText({ text: '오후 2:31', size: 12, color: '#93C5FD' });
  customerBubble.appendChild(customerText);
  customerBubble.appendChild(customerTime);
  customerRow.appendChild(customerBubble);
  messageArea.appendChild(customerRow);

  // AI response
  const aiRow2 = createAutoLayoutFrame({ name: 'AI Message Row 2', direction: 'HORIZONTAL', gap: 8, width: 'FILL' });
  aiRow2.counterAxisAlignItems = 'MIN';
  const aiAvatar2 = createCircle('AI Avatar', 28, COLORS.primaryLight);
  aiRow2.appendChild(aiAvatar2);

  const aiBubble2 = createAutoLayoutFrame({
    name: 'AI Bubble 2',
    direction: 'VERTICAL',
    padding: SPACING.md,
    gap: 4,
    fill: COLORS.white,
    cornerRadius: RADIUS.lg,
    stroke: COLORS.neutral300,
  });
  aiBubble2.resize(300, aiBubble2.height);
  aiBubble2.layoutSizingHorizontal = 'FIXED';
  const aiText2 = createText({ text: '결제 오류가 발생하셨군요.\n어떤 결제 수단을 사용하셨나요?\n(신용카드, 체크카드, 간편결제 등)', size: 14, color: COLORS.neutral900, width: 276 });
  const aiTime2 = createText({ text: '오후 2:31', size: 12, color: COLORS.neutral500 });
  aiBubble2.appendChild(aiText2);
  aiBubble2.appendChild(aiTime2);
  aiRow2.appendChild(aiBubble2);
  messageArea.appendChild(aiRow2);

  // Typing indicator
  const typingRow = createAutoLayoutFrame({ name: 'Typing Row', direction: 'HORIZONTAL', gap: 8, width: 'FILL' });
  typingRow.counterAxisAlignItems = 'CENTER';
  const aiAvatar3 = createCircle('AI Avatar', 28, COLORS.primaryLight);
  typingRow.appendChild(aiAvatar3);

  const typingBubble = createAutoLayoutFrame({
    name: 'Typing Indicator',
    direction: 'HORIZONTAL',
    padding: { top: 12, right: 16, bottom: 12, left: 16 },
    gap: 6,
    fill: COLORS.white,
    cornerRadius: RADIUS.lg,
    stroke: COLORS.neutral300,
  });
  for (let i = 0; i < 3; i++) {
    const dot = createCircle(`Dot ${i}`, 8, COLORS.neutral300);
    typingBubble.appendChild(dot);
  }
  typingRow.appendChild(typingBubble);
  // Don't add typing row to keep clean — add it as a second frame
  // messageArea.appendChild(typingRow);

  root.appendChild(messageArea);

  // ── Input Area ──
  const inputArea = createAutoLayoutFrame({
    name: 'Input Area',
    direction: 'HORIZONTAL',
    width: 'FILL',
    height: 56,
    fill: COLORS.white,
    padding: { top: 10, right: 12, bottom: 10, left: 16 },
    gap: 8,
    stroke: COLORS.neutral300,
  });
  inputArea.counterAxisAlignItems = 'CENTER';

  const inputField = createAutoLayoutFrame({
    name: 'Input Field',
    direction: 'HORIZONTAL',
    width: 'FILL',
    height: 36,
    padding: { top: 8, right: 12, bottom: 8, left: 12 },
  });
  const placeholder = createText({ text: '메시지를 입력하세요...', size: 14, color: COLORS.neutral500 });
  inputField.appendChild(placeholder);
  inputArea.appendChild(inputField);

  const sendBtn = createCircle('Send Button', 36, COLORS.primary);
  inputArea.appendChild(sendBtn);

  root.appendChild(inputArea);

  // ── Footer ──
  const footer = createAutoLayoutFrame({
    name: 'Footer',
    direction: 'HORIZONTAL',
    width: 'FILL',
    height: 32,
    fill: COLORS.neutral50,
    padding: { top: 8, right: 16, bottom: 8, left: 16 },
  });
  footer.primaryAxisAlignItems = 'CENTER';
  const footerText = createText({ text: 'Powered by VOC AI Assistant', size: 11, color: COLORS.neutral500 });
  footer.appendChild(footerText);
  root.appendChild(footer);

  finalize(root);

  // ── Escalation variant ──
  const escRoot = createAutoLayoutFrame({
    name: 'Customer Chat - Escalation (/chat)',
    direction: 'VERTICAL',
    width: CHAT_WIDTH,
    height: CHAT_HEIGHT,
    fill: COLORS.white,
    cornerRadius: RADIUS.xl,
  });
  escRoot.strokes = [solidPaint(COLORS.neutral300)];
  escRoot.strokeWeight = 1;

  // Reuse header
  const escHeader = createAutoLayoutFrame({
    name: 'Chat Header',
    direction: 'HORIZONTAL',
    width: 'FILL',
    height: 64,
    fill: COLORS.white,
    padding: { top: 12, right: 16, bottom: 12, left: 16 },
    gap: 12,
    stroke: COLORS.neutral300,
  });
  escHeader.counterAxisAlignItems = 'CENTER';
  const escAvatar = createCircle('AI Avatar', 40, COLORS.primaryLight);
  escHeader.appendChild(escAvatar);
  const escInfo = createAutoLayoutFrame({ name: 'Header Info', direction: 'VERTICAL', gap: 2 });
  escInfo.appendChild(createText({ text: 'AI 상담 도우미', size: 16, weight: 600, color: COLORS.neutral900 }));
  const escStatusRow = createAutoLayoutFrame({ name: 'Status', direction: 'HORIZONTAL', gap: 6 });
  escStatusRow.counterAxisAlignItems = 'CENTER';
  escStatusRow.appendChild(createCircle('Online', 8, COLORS.success));
  escStatusRow.appendChild(createText({ text: '온라인', size: 12, color: COLORS.success }));
  escInfo.appendChild(escStatusRow);
  escHeader.appendChild(escInfo);
  escRoot.appendChild(escHeader);

  // Escalation message area
  const escMsgArea = createAutoLayoutFrame({
    name: 'Message Area',
    direction: 'VERTICAL',
    width: 'FILL',
    height: 'FILL',
    fill: COLORS.neutral50,
    padding: 16,
    gap: 16,
  });

  // AI escalation message
  const escMsgRow = createAutoLayoutFrame({ name: 'AI Escalation Row', direction: 'HORIZONTAL', gap: 8, width: 'FILL' });
  escMsgRow.counterAxisAlignItems = 'MIN';
  escMsgRow.appendChild(createCircle('AI Avatar', 28, COLORS.primaryLight));

  const escBubble = createAutoLayoutFrame({
    name: 'Escalation Bubble',
    direction: 'VERTICAL',
    padding: SPACING.md,
    gap: 12,
    fill: COLORS.warningLight,
    cornerRadius: RADIUS.lg,
    stroke: '#FDE68A',
  });
  escBubble.resize(320, escBubble.height);
  escBubble.layoutSizingHorizontal = 'FIXED';
  escBubble.appendChild(createText({
    text: '이 문제는 전문 상담사가 더 잘 도와드릴 수 있을 것 같아요.\n담당자에게 연결해 드릴까요?',
    size: 14, color: COLORS.neutral900, width: 296,
  }));

  // Action buttons inside bubble
  const escActions = createAutoLayoutFrame({ name: 'Escalation Actions', direction: 'HORIZONTAL', gap: 8 });
  const connectBtn = createAutoLayoutFrame({
    name: 'Connect Btn',
    direction: 'HORIZONTAL',
    padding: { top: 8, right: 14, bottom: 8, left: 14 },
    fill: COLORS.primary,
    cornerRadius: RADIUS.sm,
  });
  connectBtn.appendChild(createText({ text: '💬 상담사 연결', size: 13, weight: 600, color: COLORS.white }));

  const continueBtn = createAutoLayoutFrame({
    name: 'Continue Btn',
    direction: 'HORIZONTAL',
    padding: { top: 8, right: 14, bottom: 8, left: 14 },
    fill: COLORS.white,
    cornerRadius: RADIUS.sm,
    stroke: COLORS.neutral300,
  });
  continueBtn.appendChild(createText({ text: '🤖 AI 계속 상담', size: 13, weight: 500, color: COLORS.neutral700 }));

  escActions.appendChild(connectBtn);
  escActions.appendChild(continueBtn);
  escBubble.appendChild(escActions);
  escMsgRow.appendChild(escBubble);
  escMsgArea.appendChild(escMsgRow);

  // Contact form
  const formRow = createAutoLayoutFrame({ name: 'Form Row', direction: 'HORIZONTAL', gap: 8, width: 'FILL' });
  formRow.counterAxisAlignItems = 'MIN';
  formRow.appendChild(createCircle('AI Avatar', 28, COLORS.primaryLight));

  const formBubble = createAutoLayoutFrame({
    name: 'Contact Form',
    direction: 'VERTICAL',
    padding: SPACING.base,
    gap: 12,
    fill: COLORS.white,
    cornerRadius: RADIUS.lg,
    stroke: COLORS.neutral300,
  });
  formBubble.resize(300, formBubble.height);
  formBubble.layoutSizingHorizontal = 'FIXED';

  formBubble.appendChild(createText({ text: '연락처를 알려주시면 담당자가 빠르게 연락드릴게요.', size: 13, color: COLORS.neutral700, width: 268 }));

  // Name field
  const nameField = createAutoLayoutFrame({ name: 'Name Field', direction: 'VERTICAL', gap: 4, width: 'FILL' });
  nameField.appendChild(createText({ text: '이름 (선택)', size: 12, weight: 500, color: COLORS.neutral500 }));
  const nameInput = createAutoLayoutFrame({
    name: 'Name Input',
    direction: 'HORIZONTAL',
    width: 'FILL',
    height: 36,
    padding: { top: 8, right: 12, bottom: 8, left: 12 },
    fill: COLORS.neutral50,
    cornerRadius: RADIUS.sm,
    stroke: COLORS.neutral300,
  });
  nameInput.appendChild(createText({ text: '홍길동', size: 14, color: COLORS.neutral900 }));
  nameField.appendChild(nameInput);
  formBubble.appendChild(nameField);

  // Email field
  const emailField = createAutoLayoutFrame({ name: 'Email Field', direction: 'VERTICAL', gap: 4, width: 'FILL' });
  emailField.appendChild(createText({ text: '이메일 (필수)', size: 12, weight: 500, color: COLORS.neutral500 }));
  const emailInput = createAutoLayoutFrame({
    name: 'Email Input',
    direction: 'HORIZONTAL',
    width: 'FILL',
    height: 36,
    padding: { top: 8, right: 12, bottom: 8, left: 12 },
    fill: COLORS.neutral50,
    cornerRadius: RADIUS.sm,
    stroke: COLORS.neutral300,
  });
  emailInput.appendChild(createText({ text: 'hong@email.com', size: 14, color: COLORS.neutral900 }));
  emailField.appendChild(emailInput);
  formBubble.appendChild(emailField);

  // Submit button
  const submitBtn = createAutoLayoutFrame({
    name: 'Submit Btn',
    direction: 'HORIZONTAL',
    width: 'FILL',
    height: 36,
    fill: COLORS.primary,
    cornerRadius: RADIUS.sm,
  });
  submitBtn.primaryAxisAlignItems = 'CENTER';
  submitBtn.counterAxisAlignItems = 'CENTER';
  submitBtn.appendChild(createText({ text: '연결 요청하기', size: 14, weight: 600, color: COLORS.white }));
  formBubble.appendChild(submitBtn);

  formRow.appendChild(formBubble);
  escMsgArea.appendChild(formRow);

  escRoot.appendChild(escMsgArea);

  // Input area for esc variant
  const escInput = createAutoLayoutFrame({
    name: 'Input Area',
    direction: 'HORIZONTAL',
    width: 'FILL',
    height: 56,
    fill: COLORS.white,
    padding: { top: 10, right: 12, bottom: 10, left: 16 },
    gap: 8,
    stroke: COLORS.neutral300,
  });
  escInput.counterAxisAlignItems = 'CENTER';
  const escInputField = createAutoLayoutFrame({ name: 'Input Field', direction: 'HORIZONTAL', width: 'FILL', height: 36, padding: { top: 8, right: 12, bottom: 8, left: 12 } });
  escInputField.appendChild(createText({ text: '메시지를 입력하세요...', size: 14, color: COLORS.neutral500 }));
  escInput.appendChild(escInputField);
  escInput.appendChild(createCircle('Send', 36, COLORS.neutral300));
  escRoot.appendChild(escInput);

  // Footer
  const escFooter = createAutoLayoutFrame({
    name: 'Footer',
    direction: 'HORIZONTAL',
    width: 'FILL',
    height: 32,
    fill: COLORS.neutral50,
    padding: { top: 8, right: 16, bottom: 8, left: 16 },
  });
  escFooter.primaryAxisAlignItems = 'CENTER';
  escFooter.appendChild(createText({ text: 'Powered by VOC AI Assistant', size: 11, color: COLORS.neutral500 }));
  escRoot.appendChild(escFooter);

  finalize(escRoot);

  return [root, escRoot];
}
