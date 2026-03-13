import { COLORS, RADIUS, SPACING } from '../utils/constants';
import { createAutoLayoutFrame, createText, solidPaint, finalize } from '../utils/helpers';

export async function generateLogin(): Promise<FrameNode[]> {
  const root = createAutoLayoutFrame({
    name: 'Admin Login (/login)',
    direction: 'HORIZONTAL',
    width: 1440,
    height: 900,
    fill: COLORS.neutral50,
  });

  // Left side — branding
  const leftPanel = createAutoLayoutFrame({
    name: 'Branding',
    direction: 'VERTICAL',
    width: 720,
    height: 'FILL',
    fill: COLORS.neutral900,
    padding: SPACING.xxl,
    gap: 24,
  });
  leftPanel.primaryAxisAlignItems = 'CENTER';
  leftPanel.counterAxisAlignItems = 'CENTER';

  leftPanel.appendChild(createText({ text: '🤖', size: 64 }));
  leftPanel.appendChild(createText({ text: 'VOC AI Assistant', size: 32, weight: 700, color: COLORS.white }));
  leftPanel.appendChild(createText({ text: 'AI 챗봇 기반 고객 지원 시스템', size: 16, color: '#9CA3AF' }));
  leftPanel.appendChild(createText({ text: '관리자 대시보드에 로그인하세요', size: 14, color: '#6B7280' }));

  root.appendChild(leftPanel);

  // Right side — login form
  const rightPanel = createAutoLayoutFrame({
    name: 'Login Form Panel',
    direction: 'VERTICAL',
    width: 720,
    height: 'FILL',
    fill: COLORS.white,
    padding: SPACING.xxl,
  });
  rightPanel.primaryAxisAlignItems = 'CENTER';
  rightPanel.counterAxisAlignItems = 'CENTER';

  const formCard = createAutoLayoutFrame({
    name: 'Login Form',
    direction: 'VERTICAL',
    width: 400,
    padding: SPACING.xl,
    gap: 20,
  });

  formCard.appendChild(createText({ text: '로그인', size: 24, weight: 700, color: COLORS.neutral900 }));
  formCard.appendChild(createText({ text: '관리자 계정으로 로그인해 주세요', size: 14, color: COLORS.neutral500 }));

  // Username field
  const usernameGroup = createAutoLayoutFrame({ name: 'Username', direction: 'VERTICAL', gap: 6, width: 'FILL' });
  usernameGroup.appendChild(createText({ text: '아이디', size: 13, weight: 500, color: COLORS.neutral700 }));
  const usernameInput = createAutoLayoutFrame({
    name: 'Input',
    direction: 'HORIZONTAL',
    width: 'FILL',
    height: 44,
    padding: { top: 10, right: 14, bottom: 10, left: 14 },
    fill: COLORS.neutral50,
    cornerRadius: RADIUS.sm,
    stroke: COLORS.neutral300,
  });
  usernameInput.appendChild(createText({ text: 'admin@company.com', size: 14, color: COLORS.neutral500 }));
  usernameGroup.appendChild(usernameInput);
  formCard.appendChild(usernameGroup);

  // Password field
  const passwordGroup = createAutoLayoutFrame({ name: 'Password', direction: 'VERTICAL', gap: 6, width: 'FILL' });
  passwordGroup.appendChild(createText({ text: '비밀번호', size: 13, weight: 500, color: COLORS.neutral700 }));
  const passwordInput = createAutoLayoutFrame({
    name: 'Input',
    direction: 'HORIZONTAL',
    width: 'FILL',
    height: 44,
    padding: { top: 10, right: 14, bottom: 10, left: 14 },
    fill: COLORS.neutral50,
    cornerRadius: RADIUS.sm,
    stroke: COLORS.neutral300,
  });
  passwordInput.appendChild(createText({ text: '••••••••', size: 14, color: COLORS.neutral500 }));
  passwordGroup.appendChild(passwordInput);
  formCard.appendChild(passwordGroup);

  // Login button
  const loginBtn = createAutoLayoutFrame({
    name: 'Login Button',
    direction: 'HORIZONTAL',
    width: 'FILL',
    height: 44,
    fill: COLORS.primary,
    cornerRadius: RADIUS.sm,
  });
  loginBtn.primaryAxisAlignItems = 'CENTER';
  loginBtn.counterAxisAlignItems = 'CENTER';
  loginBtn.appendChild(createText({ text: '로그인', size: 15, weight: 600, color: COLORS.white }));
  formCard.appendChild(loginBtn);

  rightPanel.appendChild(formCard);
  root.appendChild(rightPanel);

  finalize(root);
  return [root];
}
