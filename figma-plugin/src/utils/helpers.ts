import { FONT_FAMILY, FONT_FALLBACK, COLORS, RADIUS } from './constants';

// ── Deferred FILL Sizing ────────────────────────────────────────────
const _deferredFills = new WeakMap<SceneNode, { h?: boolean; v?: boolean }>();

function deferFill(node: SceneNode, axis: 'h' | 'v'): void {
  const existing = _deferredFills.get(node) || {};
  existing[axis] = true;
  _deferredFills.set(node, existing);
}

export function markFillH(node: SceneNode): void { deferFill(node, 'h'); }
export function markFillV(node: SceneNode): void { deferFill(node, 'v'); }

export function finalize(root: FrameNode): void {
  for (const child of root.children) {
    const d = _deferredFills.get(child);
    if (d) {
      if (d.h) (child as any).layoutSizingHorizontal = 'FILL';
      if (d.v) (child as any).layoutSizingVertical = 'FILL';
      _deferredFills.delete(child);
    }
    if ('children' in child) {
      finalize(child as FrameNode);
    }
  }
}

// ── Color Utilities ─────────────────────────────────────────────────

export function hexToRgb(hex: string): RGB {
  const h = hex.replace('#', '');
  return {
    r: parseInt(h.substring(0, 2), 16) / 255,
    g: parseInt(h.substring(2, 4), 16) / 255,
    b: parseInt(h.substring(4, 6), 16) / 255,
  };
}

export function solidPaint(hex: string): SolidPaint {
  return { type: 'SOLID', color: hexToRgb(hex) };
}

// ── Font Loading ────────────────────────────────────────────────────

let resolvedFont = FONT_FAMILY;

export async function loadFonts(): Promise<void> {
  const weights: FontName['style'][] = ['Regular', 'Medium', 'Semi Bold', 'Bold'];
  try {
    for (const style of weights) {
      await figma.loadFontAsync({ family: FONT_FAMILY, style });
    }
    resolvedFont = FONT_FAMILY;
  } catch {
    for (const style of weights) {
      await figma.loadFontAsync({ family: FONT_FALLBACK, style });
    }
    resolvedFont = FONT_FALLBACK;
  }
}

export function fontName(weight: number): FontName {
  const styleMap: Record<number, FontName['style']> = {
    400: 'Regular',
    500: 'Medium',
    600: 'Semi Bold',
    700: 'Bold',
  };
  return { family: resolvedFont, style: styleMap[weight] || 'Regular' };
}

// ── Node Builders ───────────────────────────────────────────────────

export interface AutoLayoutOpts {
  name: string;
  direction?: 'HORIZONTAL' | 'VERTICAL';
  padding?: number | { top?: number; right?: number; bottom?: number; left?: number };
  gap?: number;
  width?: number | 'FILL' | 'HUG';
  height?: number | 'FILL' | 'HUG';
  fill?: string;
  cornerRadius?: number;
  stroke?: string;
  strokeWeight?: number;
}

export function createAutoLayoutFrame(opts: AutoLayoutOpts): FrameNode {
  const frame = figma.createFrame();
  frame.name = opts.name;
  frame.layoutMode = opts.direction || 'VERTICAL';
  frame.primaryAxisSizingMode = 'AUTO';
  frame.counterAxisSizingMode = 'AUTO';

  if (typeof opts.padding === 'number') {
    frame.paddingTop = opts.padding;
    frame.paddingRight = opts.padding;
    frame.paddingBottom = opts.padding;
    frame.paddingLeft = opts.padding;
  } else if (opts.padding) {
    frame.paddingTop = opts.padding.top ?? 0;
    frame.paddingRight = opts.padding.right ?? 0;
    frame.paddingBottom = opts.padding.bottom ?? 0;
    frame.paddingLeft = opts.padding.left ?? 0;
  }

  frame.itemSpacing = opts.gap ?? 0;

  if (opts.width === 'FILL') {
    deferFill(frame, 'h');
  } else if (opts.width === 'HUG') {
    frame.layoutSizingHorizontal = 'HUG';
  } else if (typeof opts.width === 'number') {
    frame.layoutSizingHorizontal = 'FIXED';
    frame.resize(opts.width, frame.height);
  }

  if (opts.height === 'FILL') {
    deferFill(frame, 'v');
  } else if (opts.height === 'HUG') {
    frame.layoutSizingVertical = 'HUG';
  } else if (typeof opts.height === 'number') {
    frame.layoutSizingVertical = 'FIXED';
    frame.resize(frame.width, opts.height);
  }

  if (opts.fill) {
    frame.fills = [solidPaint(opts.fill)];
  } else {
    frame.fills = [];
  }

  if (opts.cornerRadius !== undefined) {
    frame.cornerRadius = opts.cornerRadius;
  }

  if (opts.stroke) {
    frame.strokes = [solidPaint(opts.stroke)];
    frame.strokeWeight = opts.strokeWeight ?? 1;
  }

  return frame;
}

export interface TextOpts {
  text: string;
  size?: number;
  weight?: number;
  color?: string;
  width?: number | 'FILL';
}

export function createText(opts: TextOpts): TextNode {
  const node = figma.createText();
  node.fontName = fontName(opts.weight ?? 400);
  node.fontSize = opts.size ?? 14;
  node.characters = opts.text;
  node.fills = [solidPaint(opts.color ?? COLORS.neutral900)];

  if (opts.width === 'FILL') {
    deferFill(node, 'h');
  } else if (typeof opts.width === 'number') {
    node.resize(opts.width, node.height);
    node.textAutoResize = 'HEIGHT';
  }

  return node;
}

export function createPlaceholder(
  name: string,
  width: number,
  height: number,
  color?: string,
): RectangleNode {
  const rect = figma.createRectangle();
  rect.name = name;
  rect.resize(width, height);
  rect.fills = [solidPaint(color ?? '#e0e0e0')];
  rect.cornerRadius = RADIUS.md;
  return rect;
}

// ── Circle (for avatars, status dots) ───────────────────────────────

export function createCircle(name: string, size: number, color: string): EllipseNode {
  const circle = figma.createEllipse();
  circle.name = name;
  circle.resize(size, size);
  circle.fills = [solidPaint(color)];
  return circle;
}

// ── Badge ───────────────────────────────────────────────────────────

export function createBadge(label: string, bg: string, textColor: string): FrameNode {
  const badge = createAutoLayoutFrame({
    name: `Badge - ${label}`,
    direction: 'HORIZONTAL',
    padding: { top: 2, right: 8, bottom: 2, left: 8 },
    fill: bg,
    cornerRadius: RADIUS.full,
  });
  const text = createText({ text: label, size: 11, weight: 500, color: textColor });
  badge.appendChild(text);
  return badge;
}

// ── Admin App Shell ─────────────────────────────────────────────────

export function buildAppShell(pageName: string): {
  root: FrameNode;
  sidebar: FrameNode;
  mainArea: FrameNode;
  content: FrameNode;
} {
  const root = createAutoLayoutFrame({
    name: pageName,
    direction: 'HORIZONTAL',
    width: 1440,
    height: 900,
    fill: COLORS.neutral50,
  });

  // Sidebar
  const sidebar = createAutoLayoutFrame({
    name: 'Sidebar',
    direction: 'VERTICAL',
    width: 240,
    height: 'FILL',
    fill: COLORS.neutral900,
    padding: { top: 16, right: 12, bottom: 16, left: 12 },
    gap: 4,
  });

  const logo = createText({ text: 'VOC AI Assistant', size: 18, weight: 700, color: COLORS.white });
  sidebar.appendChild(logo);

  const divider = createAutoLayoutFrame({ name: 'Divider', direction: 'HORIZONTAL', width: 'FILL', height: 1, fill: '#374151' });
  sidebar.appendChild(divider);

  const navItems = [
    { icon: '📊', label: 'Dashboard', active: pageName === 'Dashboard' },
    { icon: '💬', label: '대화 관리', active: pageName === '대화 목록' || pageName === '대화 상세' },
    { icon: '📚', label: 'Knowledge Base', active: pageName === 'Knowledge Base' },
    { icon: '⚙️', label: '설정', active: false },
  ];

  for (const item of navItems) {
    const navItem = createAutoLayoutFrame({
      name: `Nav - ${item.label}`,
      direction: 'HORIZONTAL',
      padding: { top: 10, right: 12, bottom: 10, left: 12 },
      gap: 10,
      width: 'FILL',
      cornerRadius: RADIUS.sm,
      fill: item.active ? '#1E3A5F' : undefined,
    });
    if (item.active) {
      navItem.strokes = [solidPaint(COLORS.primary)];
      navItem.strokeWeight = 2;
      navItem.strokeAlign = 'INSIDE';
    }
    const iconText = createText({ text: item.icon, size: 16, weight: 400, color: COLORS.white });
    const label = createText({ text: item.label, size: 14, weight: item.active ? 600 : 400, color: item.active ? COLORS.white : '#D1D5DB' });
    navItem.appendChild(iconText);
    navItem.appendChild(label);
    sidebar.appendChild(navItem);
  }

  root.appendChild(sidebar);

  // Main area
  const mainArea = createAutoLayoutFrame({
    name: 'Main Area',
    direction: 'VERTICAL',
    width: 'FILL',
    height: 'FILL',
  });

  // Header
  const header = createAutoLayoutFrame({
    name: 'Header',
    direction: 'HORIZONTAL',
    width: 'FILL',
    height: 56,
    fill: COLORS.white,
    padding: { top: 0, right: 24, bottom: 0, left: 24 },
    gap: 12,
    stroke: COLORS.neutral300,
  });
  header.counterAxisAlignItems = 'CENTER';
  header.primaryAxisAlignItems = 'SPACE_BETWEEN';

  const breadcrumb = createText({ text: pageName, size: 16, weight: 600, color: COLORS.neutral900 });
  header.appendChild(breadcrumb);

  const headerRight = createAutoLayoutFrame({ name: 'Header Right', direction: 'HORIZONTAL', gap: 12 });
  headerRight.counterAxisAlignItems = 'CENTER';

  const bellBadge = createAutoLayoutFrame({ name: 'Notification Bell', direction: 'HORIZONTAL', gap: 4 });
  bellBadge.counterAxisAlignItems = 'CENTER';
  const bell = createText({ text: '🔔', size: 18 });
  const notifCount = createBadge('3', COLORS.danger, COLORS.white);
  bellBadge.appendChild(bell);
  bellBadge.appendChild(notifCount);
  headerRight.appendChild(bellBadge);

  const avatar = createCircle('Avatar', 32, COLORS.primaryLight);
  headerRight.appendChild(avatar);
  header.appendChild(headerRight);

  mainArea.appendChild(header);

  // Content
  const content = createAutoLayoutFrame({
    name: 'Content',
    direction: 'VERTICAL',
    width: 'FILL',
    height: 'FILL',
    padding: 24,
    gap: 24,
  });

  mainArea.appendChild(content);
  root.appendChild(mainArea);

  return { root, sidebar, mainArea, content };
}
