"use strict";
(() => {
  // src/utils/constants.ts
  var COLORS = {
    // Primary
    primary: "#2563EB",
    primaryLight: "#DBEAFE",
    primaryDark: "#1E40AF",
    // Success
    success: "#10B981",
    successLight: "#ECFDF5",
    successBorder: "#A7F3D0",
    // Warning
    warning: "#F59E0B",
    warningLight: "#FFFBEB",
    // Danger
    danger: "#EF4444",
    dangerLight: "#FEE2E2",
    // Neutral
    neutral900: "#111827",
    neutral700: "#374151",
    neutral500: "#6B7280",
    neutral300: "#D1D5DB",
    neutral100: "#F3F4F6",
    neutral50: "#F9FAFB",
    // Pure
    white: "#FFFFFF",
    black: "#000000"
  };
  var CONVERSATION_STATUS = {
    ACTIVE: { bg: "#ECFDF5", text: "#065F46", label: "\uC9C4\uD589\uC911" },
    ESCALATED: { bg: "#FFFBEB", text: "#92400E", label: "\uC5D0\uC2A4\uCEEC\uB808\uC774\uC158" },
    RESOLVED: { bg: "#DBEAFE", text: "#1E40AF", label: "\uD574\uACB0" },
    CLOSED: { bg: "#F3F4F6", text: "#374151", label: "\uC885\uB8CC" }
  };
  var FONT_FAMILY = "Inter";
  var FONT_FALLBACK = "Roboto";
  var SPACING = {
    xs: 4,
    sm: 8,
    md: 12,
    base: 16,
    lg: 24,
    xl: 32,
    xxl: 48
  };
  var RADIUS = {
    sm: 6,
    md: 8,
    lg: 12,
    xl: 16,
    full: 9999
  };
  var SCREEN_WIDTH = 1440;
  var SIDEBAR_WIDTH = 240;
  var CONTENT_WIDTH = SCREEN_WIDTH - SIDEBAR_WIDTH;
  var CHAT_WIDTH = 420;
  var CHAT_HEIGHT = 720;

  // src/utils/helpers.ts
  var _deferredFills = /* @__PURE__ */ new WeakMap();
  function deferFill(node, axis) {
    const existing = _deferredFills.get(node) || {};
    existing[axis] = true;
    _deferredFills.set(node, existing);
  }
  function finalize(root) {
    for (const child of root.children) {
      const d = _deferredFills.get(child);
      if (d) {
        if (d.h) child.layoutSizingHorizontal = "FILL";
        if (d.v) child.layoutSizingVertical = "FILL";
        _deferredFills.delete(child);
      }
      if ("children" in child) {
        finalize(child);
      }
    }
  }
  function hexToRgb(hex) {
    const h = hex.replace("#", "");
    return {
      r: parseInt(h.substring(0, 2), 16) / 255,
      g: parseInt(h.substring(2, 4), 16) / 255,
      b: parseInt(h.substring(4, 6), 16) / 255
    };
  }
  function solidPaint(hex) {
    return { type: "SOLID", color: hexToRgb(hex) };
  }
  var resolvedFont = FONT_FAMILY;
  async function loadFonts() {
    const weights = ["Regular", "Medium", "Semi Bold", "Bold"];
    try {
      for (const style of weights) {
        await figma.loadFontAsync({ family: FONT_FAMILY, style });
      }
      resolvedFont = FONT_FAMILY;
    } catch (e) {
      for (const style of weights) {
        await figma.loadFontAsync({ family: FONT_FALLBACK, style });
      }
      resolvedFont = FONT_FALLBACK;
    }
  }
  function fontName(weight) {
    const styleMap = {
      400: "Regular",
      500: "Medium",
      600: "Semi Bold",
      700: "Bold"
    };
    return { family: resolvedFont, style: styleMap[weight] || "Regular" };
  }
  function createAutoLayoutFrame(opts) {
    var _a, _b, _c, _d, _e, _f;
    const frame = figma.createFrame();
    frame.name = opts.name;
    frame.layoutMode = opts.direction || "VERTICAL";
    frame.primaryAxisSizingMode = "AUTO";
    frame.counterAxisSizingMode = "AUTO";
    if (typeof opts.padding === "number") {
      frame.paddingTop = opts.padding;
      frame.paddingRight = opts.padding;
      frame.paddingBottom = opts.padding;
      frame.paddingLeft = opts.padding;
    } else if (opts.padding) {
      frame.paddingTop = (_a = opts.padding.top) != null ? _a : 0;
      frame.paddingRight = (_b = opts.padding.right) != null ? _b : 0;
      frame.paddingBottom = (_c = opts.padding.bottom) != null ? _c : 0;
      frame.paddingLeft = (_d = opts.padding.left) != null ? _d : 0;
    }
    frame.itemSpacing = (_e = opts.gap) != null ? _e : 0;
    if (opts.width === "FILL") {
      deferFill(frame, "h");
    } else if (opts.width === "HUG") {
      frame.layoutSizingHorizontal = "HUG";
    } else if (typeof opts.width === "number") {
      frame.layoutSizingHorizontal = "FIXED";
      frame.resize(opts.width, frame.height);
    }
    if (opts.height === "FILL") {
      deferFill(frame, "v");
    } else if (opts.height === "HUG") {
      frame.layoutSizingVertical = "HUG";
    } else if (typeof opts.height === "number") {
      frame.layoutSizingVertical = "FIXED";
      frame.resize(frame.width, opts.height);
    }
    if (opts.fill) {
      frame.fills = [solidPaint(opts.fill)];
    } else {
      frame.fills = [];
    }
    if (opts.cornerRadius !== void 0) {
      frame.cornerRadius = opts.cornerRadius;
    }
    if (opts.stroke) {
      frame.strokes = [solidPaint(opts.stroke)];
      frame.strokeWeight = (_f = opts.strokeWeight) != null ? _f : 1;
    }
    return frame;
  }
  function createText(opts) {
    var _a, _b, _c;
    const node = figma.createText();
    node.fontName = fontName((_a = opts.weight) != null ? _a : 400);
    node.fontSize = (_b = opts.size) != null ? _b : 14;
    node.characters = opts.text;
    node.fills = [solidPaint((_c = opts.color) != null ? _c : COLORS.neutral900)];
    if (opts.width === "FILL") {
      deferFill(node, "h");
    } else if (typeof opts.width === "number") {
      node.resize(opts.width, node.height);
      node.textAutoResize = "HEIGHT";
    }
    return node;
  }
  function createPlaceholder(name, width, height, color) {
    const rect = figma.createRectangle();
    rect.name = name;
    rect.resize(width, height);
    rect.fills = [solidPaint(color != null ? color : "#e0e0e0")];
    rect.cornerRadius = RADIUS.md;
    return rect;
  }
  function createCircle(name, size, color) {
    const circle = figma.createEllipse();
    circle.name = name;
    circle.resize(size, size);
    circle.fills = [solidPaint(color)];
    return circle;
  }
  function createBadge(label, bg, textColor) {
    const badge = createAutoLayoutFrame({
      name: `Badge - ${label}`,
      direction: "HORIZONTAL",
      padding: { top: 2, right: 8, bottom: 2, left: 8 },
      fill: bg,
      cornerRadius: RADIUS.full
    });
    const text = createText({ text: label, size: 11, weight: 500, color: textColor });
    badge.appendChild(text);
    return badge;
  }
  function buildAppShell(pageName) {
    const root = createAutoLayoutFrame({
      name: pageName,
      direction: "HORIZONTAL",
      width: 1440,
      height: 900,
      fill: COLORS.neutral50
    });
    const sidebar = createAutoLayoutFrame({
      name: "Sidebar",
      direction: "VERTICAL",
      width: 240,
      height: "FILL",
      fill: COLORS.neutral900,
      padding: { top: 16, right: 12, bottom: 16, left: 12 },
      gap: 4
    });
    const logo = createText({ text: "VOC AI Assistant", size: 18, weight: 700, color: COLORS.white });
    sidebar.appendChild(logo);
    const divider = createAutoLayoutFrame({ name: "Divider", direction: "HORIZONTAL", width: "FILL", height: 1, fill: "#374151" });
    sidebar.appendChild(divider);
    const navItems = [
      { icon: "\u{1F4CA}", label: "Dashboard", active: pageName === "Dashboard" },
      { icon: "\u{1F4AC}", label: "\uB300\uD654 \uAD00\uB9AC", active: pageName === "\uB300\uD654 \uBAA9\uB85D" || pageName === "\uB300\uD654 \uC0C1\uC138" },
      { icon: "\u{1F4DA}", label: "Knowledge Base", active: pageName === "Knowledge Base" },
      { icon: "\u2699\uFE0F", label: "\uC124\uC815", active: false }
    ];
    for (const item of navItems) {
      const navItem = createAutoLayoutFrame({
        name: `Nav - ${item.label}`,
        direction: "HORIZONTAL",
        padding: { top: 10, right: 12, bottom: 10, left: 12 },
        gap: 10,
        width: "FILL",
        cornerRadius: RADIUS.sm,
        fill: item.active ? "#1E3A5F" : void 0
      });
      if (item.active) {
        navItem.strokes = [solidPaint(COLORS.primary)];
        navItem.strokeWeight = 2;
        navItem.strokeAlign = "INSIDE";
      }
      const iconText = createText({ text: item.icon, size: 16, weight: 400, color: COLORS.white });
      const label = createText({ text: item.label, size: 14, weight: item.active ? 600 : 400, color: item.active ? COLORS.white : "#D1D5DB" });
      navItem.appendChild(iconText);
      navItem.appendChild(label);
      sidebar.appendChild(navItem);
    }
    root.appendChild(sidebar);
    const mainArea = createAutoLayoutFrame({
      name: "Main Area",
      direction: "VERTICAL",
      width: "FILL",
      height: "FILL"
    });
    const header = createAutoLayoutFrame({
      name: "Header",
      direction: "HORIZONTAL",
      width: "FILL",
      height: 56,
      fill: COLORS.white,
      padding: { top: 0, right: 24, bottom: 0, left: 24 },
      gap: 12,
      stroke: COLORS.neutral300
    });
    header.counterAxisAlignItems = "CENTER";
    header.primaryAxisAlignItems = "SPACE_BETWEEN";
    const breadcrumb = createText({ text: pageName, size: 16, weight: 600, color: COLORS.neutral900 });
    header.appendChild(breadcrumb);
    const headerRight = createAutoLayoutFrame({ name: "Header Right", direction: "HORIZONTAL", gap: 12 });
    headerRight.counterAxisAlignItems = "CENTER";
    const bellBadge = createAutoLayoutFrame({ name: "Notification Bell", direction: "HORIZONTAL", gap: 4 });
    bellBadge.counterAxisAlignItems = "CENTER";
    const bell = createText({ text: "\u{1F514}", size: 18 });
    const notifCount = createBadge("3", COLORS.danger, COLORS.white);
    bellBadge.appendChild(bell);
    bellBadge.appendChild(notifCount);
    headerRight.appendChild(bellBadge);
    const avatar = createCircle("Avatar", 32, COLORS.primaryLight);
    headerRight.appendChild(avatar);
    header.appendChild(headerRight);
    mainArea.appendChild(header);
    const content = createAutoLayoutFrame({
      name: "Content",
      direction: "VERTICAL",
      width: "FILL",
      height: "FILL",
      padding: 24,
      gap: 24
    });
    mainArea.appendChild(content);
    root.appendChild(mainArea);
    return { root, sidebar, mainArea, content };
  }

  // src/screens/customer-chat.ts
  async function generateCustomerChat() {
    const root = createAutoLayoutFrame({
      name: "Customer Chat (/chat)",
      direction: "VERTICAL",
      width: CHAT_WIDTH,
      height: CHAT_HEIGHT,
      fill: COLORS.white,
      cornerRadius: RADIUS.xl
    });
    root.strokes = [solidPaint(COLORS.neutral300)];
    root.strokeWeight = 1;
    const header = createAutoLayoutFrame({
      name: "Chat Header",
      direction: "HORIZONTAL",
      width: "FILL",
      height: 64,
      fill: COLORS.white,
      padding: { top: 12, right: 16, bottom: 12, left: 16 },
      gap: 12,
      stroke: COLORS.neutral300
    });
    header.counterAxisAlignItems = "CENTER";
    const avatar = createCircle("AI Avatar", 40, COLORS.primaryLight);
    header.appendChild(avatar);
    const headerInfo = createAutoLayoutFrame({ name: "Header Info", direction: "VERTICAL", gap: 2 });
    const title = createText({ text: "AI \uC0C1\uB2F4 \uB3C4\uC6B0\uBBF8", size: 16, weight: 600, color: COLORS.neutral900 });
    const statusRow = createAutoLayoutFrame({ name: "Status", direction: "HORIZONTAL", gap: 6 });
    statusRow.counterAxisAlignItems = "CENTER";
    const dot = createCircle("Online Dot", 8, COLORS.success);
    const statusText = createText({ text: "\uC628\uB77C\uC778", size: 12, color: COLORS.success });
    statusRow.appendChild(dot);
    statusRow.appendChild(statusText);
    headerInfo.appendChild(title);
    headerInfo.appendChild(statusRow);
    header.appendChild(headerInfo);
    root.appendChild(header);
    const messageArea = createAutoLayoutFrame({
      name: "Message Area",
      direction: "VERTICAL",
      width: "FILL",
      height: "FILL",
      fill: COLORS.neutral50,
      padding: 16,
      gap: 16
    });
    const welcomeRow = createAutoLayoutFrame({ name: "AI Message Row", direction: "HORIZONTAL", gap: 8, width: "FILL" });
    welcomeRow.counterAxisAlignItems = "MIN";
    const aiAvatar1 = createCircle("AI Avatar", 28, COLORS.primaryLight);
    welcomeRow.appendChild(aiAvatar1);
    const welcomeBubble = createAutoLayoutFrame({
      name: "AI Bubble",
      direction: "VERTICAL",
      padding: SPACING.md,
      gap: 4,
      fill: COLORS.white,
      cornerRadius: RADIUS.lg,
      stroke: COLORS.neutral300
    });
    welcomeBubble.resize(280, welcomeBubble.height);
    welcomeBubble.layoutSizingHorizontal = "FIXED";
    const welcomeText = createText({ text: "\uC548\uB155\uD558\uC138\uC694! AI \uC0C1\uB2F4 \uB3C4\uC6B0\uBBF8\uC785\uB2C8\uB2E4.\n\uC5B4\uB5A4 \uBB38\uC81C\uAC00 \uC788\uC73C\uC2E0\uAC00\uC694?", size: 14, color: COLORS.neutral900, width: 256 });
    const welcomeTime = createText({ text: "\uC624\uD6C4 2:30", size: 12, color: COLORS.neutral500 });
    welcomeBubble.appendChild(welcomeText);
    welcomeBubble.appendChild(welcomeTime);
    welcomeRow.appendChild(welcomeBubble);
    messageArea.appendChild(welcomeRow);
    const quickActions = createAutoLayoutFrame({ name: "Quick Actions", direction: "HORIZONTAL", gap: 8, padding: { top: 0, right: 0, bottom: 0, left: 36 } });
    const actions = ["\uACB0\uC81C \uBB38\uC81C", "\uBC30\uC1A1 \uBB38\uC758", "\uAE30\uD0C0 \uBB38\uC758"];
    for (const action of actions) {
      const btn = createAutoLayoutFrame({
        name: `Quick - ${action}`,
        direction: "HORIZONTAL",
        padding: { top: 8, right: 14, bottom: 8, left: 14 },
        fill: COLORS.white,
        cornerRadius: RADIUS.full,
        stroke: COLORS.primary
      });
      const btnText = createText({ text: action, size: 13, weight: 500, color: COLORS.primary });
      btn.appendChild(btnText);
      quickActions.appendChild(btn);
    }
    messageArea.appendChild(quickActions);
    const customerRow = createAutoLayoutFrame({ name: "Customer Message Row", direction: "HORIZONTAL", gap: 8, width: "FILL" });
    customerRow.primaryAxisAlignItems = "MAX";
    const customerBubble = createAutoLayoutFrame({
      name: "Customer Bubble",
      direction: "VERTICAL",
      padding: SPACING.md,
      gap: 4,
      fill: COLORS.primary,
      cornerRadius: RADIUS.lg
    });
    customerBubble.resize(260, customerBubble.height);
    customerBubble.layoutSizingHorizontal = "FIXED";
    const customerText = createText({ text: "\uACB0\uC81C\uAC00 \uC548 \uB3FC\uC694. \uCE74\uB4DC \uACB0\uC81C \uC2DC \uC624\uB958\uAC00 \uBC1C\uC0DD\uD569\uB2C8\uB2E4.", size: 14, color: COLORS.white, width: 236 });
    const customerTime = createText({ text: "\uC624\uD6C4 2:31", size: 12, color: "#93C5FD" });
    customerBubble.appendChild(customerText);
    customerBubble.appendChild(customerTime);
    customerRow.appendChild(customerBubble);
    messageArea.appendChild(customerRow);
    const aiRow2 = createAutoLayoutFrame({ name: "AI Message Row 2", direction: "HORIZONTAL", gap: 8, width: "FILL" });
    aiRow2.counterAxisAlignItems = "MIN";
    const aiAvatar2 = createCircle("AI Avatar", 28, COLORS.primaryLight);
    aiRow2.appendChild(aiAvatar2);
    const aiBubble2 = createAutoLayoutFrame({
      name: "AI Bubble 2",
      direction: "VERTICAL",
      padding: SPACING.md,
      gap: 4,
      fill: COLORS.white,
      cornerRadius: RADIUS.lg,
      stroke: COLORS.neutral300
    });
    aiBubble2.resize(300, aiBubble2.height);
    aiBubble2.layoutSizingHorizontal = "FIXED";
    const aiText2 = createText({ text: "\uACB0\uC81C \uC624\uB958\uAC00 \uBC1C\uC0DD\uD558\uC168\uAD70\uC694.\n\uC5B4\uB5A4 \uACB0\uC81C \uC218\uB2E8\uC744 \uC0AC\uC6A9\uD558\uC168\uB098\uC694?\n(\uC2E0\uC6A9\uCE74\uB4DC, \uCCB4\uD06C\uCE74\uB4DC, \uAC04\uD3B8\uACB0\uC81C \uB4F1)", size: 14, color: COLORS.neutral900, width: 276 });
    const aiTime2 = createText({ text: "\uC624\uD6C4 2:31", size: 12, color: COLORS.neutral500 });
    aiBubble2.appendChild(aiText2);
    aiBubble2.appendChild(aiTime2);
    aiRow2.appendChild(aiBubble2);
    messageArea.appendChild(aiRow2);
    const typingRow = createAutoLayoutFrame({ name: "Typing Row", direction: "HORIZONTAL", gap: 8, width: "FILL" });
    typingRow.counterAxisAlignItems = "CENTER";
    const aiAvatar3 = createCircle("AI Avatar", 28, COLORS.primaryLight);
    typingRow.appendChild(aiAvatar3);
    const typingBubble = createAutoLayoutFrame({
      name: "Typing Indicator",
      direction: "HORIZONTAL",
      padding: { top: 12, right: 16, bottom: 12, left: 16 },
      gap: 6,
      fill: COLORS.white,
      cornerRadius: RADIUS.lg,
      stroke: COLORS.neutral300
    });
    for (let i = 0; i < 3; i++) {
      const dot2 = createCircle(`Dot ${i}`, 8, COLORS.neutral300);
      typingBubble.appendChild(dot2);
    }
    typingRow.appendChild(typingBubble);
    root.appendChild(messageArea);
    const inputArea = createAutoLayoutFrame({
      name: "Input Area",
      direction: "HORIZONTAL",
      width: "FILL",
      height: 56,
      fill: COLORS.white,
      padding: { top: 10, right: 12, bottom: 10, left: 16 },
      gap: 8,
      stroke: COLORS.neutral300
    });
    inputArea.counterAxisAlignItems = "CENTER";
    const inputField = createAutoLayoutFrame({
      name: "Input Field",
      direction: "HORIZONTAL",
      width: "FILL",
      height: 36,
      padding: { top: 8, right: 12, bottom: 8, left: 12 }
    });
    const placeholder = createText({ text: "\uBA54\uC2DC\uC9C0\uB97C \uC785\uB825\uD558\uC138\uC694...", size: 14, color: COLORS.neutral500 });
    inputField.appendChild(placeholder);
    inputArea.appendChild(inputField);
    const sendBtn = createCircle("Send Button", 36, COLORS.primary);
    inputArea.appendChild(sendBtn);
    root.appendChild(inputArea);
    const footer = createAutoLayoutFrame({
      name: "Footer",
      direction: "HORIZONTAL",
      width: "FILL",
      height: 32,
      fill: COLORS.neutral50,
      padding: { top: 8, right: 16, bottom: 8, left: 16 }
    });
    footer.primaryAxisAlignItems = "CENTER";
    const footerText = createText({ text: "Powered by VOC AI Assistant", size: 11, color: COLORS.neutral500 });
    footer.appendChild(footerText);
    root.appendChild(footer);
    finalize(root);
    const escRoot = createAutoLayoutFrame({
      name: "Customer Chat - Escalation (/chat)",
      direction: "VERTICAL",
      width: CHAT_WIDTH,
      height: CHAT_HEIGHT,
      fill: COLORS.white,
      cornerRadius: RADIUS.xl
    });
    escRoot.strokes = [solidPaint(COLORS.neutral300)];
    escRoot.strokeWeight = 1;
    const escHeader = createAutoLayoutFrame({
      name: "Chat Header",
      direction: "HORIZONTAL",
      width: "FILL",
      height: 64,
      fill: COLORS.white,
      padding: { top: 12, right: 16, bottom: 12, left: 16 },
      gap: 12,
      stroke: COLORS.neutral300
    });
    escHeader.counterAxisAlignItems = "CENTER";
    const escAvatar = createCircle("AI Avatar", 40, COLORS.primaryLight);
    escHeader.appendChild(escAvatar);
    const escInfo = createAutoLayoutFrame({ name: "Header Info", direction: "VERTICAL", gap: 2 });
    escInfo.appendChild(createText({ text: "AI \uC0C1\uB2F4 \uB3C4\uC6B0\uBBF8", size: 16, weight: 600, color: COLORS.neutral900 }));
    const escStatusRow = createAutoLayoutFrame({ name: "Status", direction: "HORIZONTAL", gap: 6 });
    escStatusRow.counterAxisAlignItems = "CENTER";
    escStatusRow.appendChild(createCircle("Online", 8, COLORS.success));
    escStatusRow.appendChild(createText({ text: "\uC628\uB77C\uC778", size: 12, color: COLORS.success }));
    escInfo.appendChild(escStatusRow);
    escHeader.appendChild(escInfo);
    escRoot.appendChild(escHeader);
    const escMsgArea = createAutoLayoutFrame({
      name: "Message Area",
      direction: "VERTICAL",
      width: "FILL",
      height: "FILL",
      fill: COLORS.neutral50,
      padding: 16,
      gap: 16
    });
    const escMsgRow = createAutoLayoutFrame({ name: "AI Escalation Row", direction: "HORIZONTAL", gap: 8, width: "FILL" });
    escMsgRow.counterAxisAlignItems = "MIN";
    escMsgRow.appendChild(createCircle("AI Avatar", 28, COLORS.primaryLight));
    const escBubble = createAutoLayoutFrame({
      name: "Escalation Bubble",
      direction: "VERTICAL",
      padding: SPACING.md,
      gap: 12,
      fill: COLORS.warningLight,
      cornerRadius: RADIUS.lg,
      stroke: "#FDE68A"
    });
    escBubble.resize(320, escBubble.height);
    escBubble.layoutSizingHorizontal = "FIXED";
    escBubble.appendChild(createText({
      text: "\uC774 \uBB38\uC81C\uB294 \uC804\uBB38 \uC0C1\uB2F4\uC0AC\uAC00 \uB354 \uC798 \uB3C4\uC640\uB4DC\uB9B4 \uC218 \uC788\uC744 \uAC83 \uAC19\uC544\uC694.\n\uB2F4\uB2F9\uC790\uC5D0\uAC8C \uC5F0\uACB0\uD574 \uB4DC\uB9B4\uAE4C\uC694?",
      size: 14,
      color: COLORS.neutral900,
      width: 296
    }));
    const escActions = createAutoLayoutFrame({ name: "Escalation Actions", direction: "HORIZONTAL", gap: 8 });
    const connectBtn = createAutoLayoutFrame({
      name: "Connect Btn",
      direction: "HORIZONTAL",
      padding: { top: 8, right: 14, bottom: 8, left: 14 },
      fill: COLORS.primary,
      cornerRadius: RADIUS.sm
    });
    connectBtn.appendChild(createText({ text: "\u{1F4AC} \uC0C1\uB2F4\uC0AC \uC5F0\uACB0", size: 13, weight: 600, color: COLORS.white }));
    const continueBtn = createAutoLayoutFrame({
      name: "Continue Btn",
      direction: "HORIZONTAL",
      padding: { top: 8, right: 14, bottom: 8, left: 14 },
      fill: COLORS.white,
      cornerRadius: RADIUS.sm,
      stroke: COLORS.neutral300
    });
    continueBtn.appendChild(createText({ text: "\u{1F916} AI \uACC4\uC18D \uC0C1\uB2F4", size: 13, weight: 500, color: COLORS.neutral700 }));
    escActions.appendChild(connectBtn);
    escActions.appendChild(continueBtn);
    escBubble.appendChild(escActions);
    escMsgRow.appendChild(escBubble);
    escMsgArea.appendChild(escMsgRow);
    const formRow = createAutoLayoutFrame({ name: "Form Row", direction: "HORIZONTAL", gap: 8, width: "FILL" });
    formRow.counterAxisAlignItems = "MIN";
    formRow.appendChild(createCircle("AI Avatar", 28, COLORS.primaryLight));
    const formBubble = createAutoLayoutFrame({
      name: "Contact Form",
      direction: "VERTICAL",
      padding: SPACING.base,
      gap: 12,
      fill: COLORS.white,
      cornerRadius: RADIUS.lg,
      stroke: COLORS.neutral300
    });
    formBubble.resize(300, formBubble.height);
    formBubble.layoutSizingHorizontal = "FIXED";
    formBubble.appendChild(createText({ text: "\uC5F0\uB77D\uCC98\uB97C \uC54C\uB824\uC8FC\uC2DC\uBA74 \uB2F4\uB2F9\uC790\uAC00 \uBE60\uB974\uAC8C \uC5F0\uB77D\uB4DC\uB9B4\uAC8C\uC694.", size: 13, color: COLORS.neutral700, width: 268 }));
    const nameField = createAutoLayoutFrame({ name: "Name Field", direction: "VERTICAL", gap: 4, width: "FILL" });
    nameField.appendChild(createText({ text: "\uC774\uB984 (\uC120\uD0DD)", size: 12, weight: 500, color: COLORS.neutral500 }));
    const nameInput = createAutoLayoutFrame({
      name: "Name Input",
      direction: "HORIZONTAL",
      width: "FILL",
      height: 36,
      padding: { top: 8, right: 12, bottom: 8, left: 12 },
      fill: COLORS.neutral50,
      cornerRadius: RADIUS.sm,
      stroke: COLORS.neutral300
    });
    nameInput.appendChild(createText({ text: "\uD64D\uAE38\uB3D9", size: 14, color: COLORS.neutral900 }));
    nameField.appendChild(nameInput);
    formBubble.appendChild(nameField);
    const emailField = createAutoLayoutFrame({ name: "Email Field", direction: "VERTICAL", gap: 4, width: "FILL" });
    emailField.appendChild(createText({ text: "\uC774\uBA54\uC77C (\uD544\uC218)", size: 12, weight: 500, color: COLORS.neutral500 }));
    const emailInput = createAutoLayoutFrame({
      name: "Email Input",
      direction: "HORIZONTAL",
      width: "FILL",
      height: 36,
      padding: { top: 8, right: 12, bottom: 8, left: 12 },
      fill: COLORS.neutral50,
      cornerRadius: RADIUS.sm,
      stroke: COLORS.neutral300
    });
    emailInput.appendChild(createText({ text: "hong@email.com", size: 14, color: COLORS.neutral900 }));
    emailField.appendChild(emailInput);
    formBubble.appendChild(emailField);
    const submitBtn = createAutoLayoutFrame({
      name: "Submit Btn",
      direction: "HORIZONTAL",
      width: "FILL",
      height: 36,
      fill: COLORS.primary,
      cornerRadius: RADIUS.sm
    });
    submitBtn.primaryAxisAlignItems = "CENTER";
    submitBtn.counterAxisAlignItems = "CENTER";
    submitBtn.appendChild(createText({ text: "\uC5F0\uACB0 \uC694\uCCAD\uD558\uAE30", size: 14, weight: 600, color: COLORS.white }));
    formBubble.appendChild(submitBtn);
    formRow.appendChild(formBubble);
    escMsgArea.appendChild(formRow);
    escRoot.appendChild(escMsgArea);
    const escInput = createAutoLayoutFrame({
      name: "Input Area",
      direction: "HORIZONTAL",
      width: "FILL",
      height: 56,
      fill: COLORS.white,
      padding: { top: 10, right: 12, bottom: 10, left: 16 },
      gap: 8,
      stroke: COLORS.neutral300
    });
    escInput.counterAxisAlignItems = "CENTER";
    const escInputField = createAutoLayoutFrame({ name: "Input Field", direction: "HORIZONTAL", width: "FILL", height: 36, padding: { top: 8, right: 12, bottom: 8, left: 12 } });
    escInputField.appendChild(createText({ text: "\uBA54\uC2DC\uC9C0\uB97C \uC785\uB825\uD558\uC138\uC694...", size: 14, color: COLORS.neutral500 }));
    escInput.appendChild(escInputField);
    escInput.appendChild(createCircle("Send", 36, COLORS.neutral300));
    escRoot.appendChild(escInput);
    const escFooter = createAutoLayoutFrame({
      name: "Footer",
      direction: "HORIZONTAL",
      width: "FILL",
      height: 32,
      fill: COLORS.neutral50,
      padding: { top: 8, right: 16, bottom: 8, left: 16 }
    });
    escFooter.primaryAxisAlignItems = "CENTER";
    escFooter.appendChild(createText({ text: "Powered by VOC AI Assistant", size: 11, color: COLORS.neutral500 }));
    escRoot.appendChild(escFooter);
    finalize(escRoot);
    return [root, escRoot];
  }

  // src/screens/login.ts
  async function generateLogin() {
    const root = createAutoLayoutFrame({
      name: "Admin Login (/login)",
      direction: "HORIZONTAL",
      width: 1440,
      height: 900,
      fill: COLORS.neutral50
    });
    const leftPanel = createAutoLayoutFrame({
      name: "Branding",
      direction: "VERTICAL",
      width: 720,
      height: "FILL",
      fill: COLORS.neutral900,
      padding: SPACING.xxl,
      gap: 24
    });
    leftPanel.primaryAxisAlignItems = "CENTER";
    leftPanel.counterAxisAlignItems = "CENTER";
    leftPanel.appendChild(createText({ text: "\u{1F916}", size: 64 }));
    leftPanel.appendChild(createText({ text: "VOC AI Assistant", size: 32, weight: 700, color: COLORS.white }));
    leftPanel.appendChild(createText({ text: "AI \uCC57\uBD07 \uAE30\uBC18 \uACE0\uAC1D \uC9C0\uC6D0 \uC2DC\uC2A4\uD15C", size: 16, color: "#9CA3AF" }));
    leftPanel.appendChild(createText({ text: "\uAD00\uB9AC\uC790 \uB300\uC2DC\uBCF4\uB4DC\uC5D0 \uB85C\uADF8\uC778\uD558\uC138\uC694", size: 14, color: "#6B7280" }));
    root.appendChild(leftPanel);
    const rightPanel = createAutoLayoutFrame({
      name: "Login Form Panel",
      direction: "VERTICAL",
      width: 720,
      height: "FILL",
      fill: COLORS.white,
      padding: SPACING.xxl
    });
    rightPanel.primaryAxisAlignItems = "CENTER";
    rightPanel.counterAxisAlignItems = "CENTER";
    const formCard = createAutoLayoutFrame({
      name: "Login Form",
      direction: "VERTICAL",
      width: 400,
      padding: SPACING.xl,
      gap: 20
    });
    formCard.appendChild(createText({ text: "\uB85C\uADF8\uC778", size: 24, weight: 700, color: COLORS.neutral900 }));
    formCard.appendChild(createText({ text: "\uAD00\uB9AC\uC790 \uACC4\uC815\uC73C\uB85C \uB85C\uADF8\uC778\uD574 \uC8FC\uC138\uC694", size: 14, color: COLORS.neutral500 }));
    const usernameGroup = createAutoLayoutFrame({ name: "Username", direction: "VERTICAL", gap: 6, width: "FILL" });
    usernameGroup.appendChild(createText({ text: "\uC544\uC774\uB514", size: 13, weight: 500, color: COLORS.neutral700 }));
    const usernameInput = createAutoLayoutFrame({
      name: "Input",
      direction: "HORIZONTAL",
      width: "FILL",
      height: 44,
      padding: { top: 10, right: 14, bottom: 10, left: 14 },
      fill: COLORS.neutral50,
      cornerRadius: RADIUS.sm,
      stroke: COLORS.neutral300
    });
    usernameInput.appendChild(createText({ text: "admin@company.com", size: 14, color: COLORS.neutral500 }));
    usernameGroup.appendChild(usernameInput);
    formCard.appendChild(usernameGroup);
    const passwordGroup = createAutoLayoutFrame({ name: "Password", direction: "VERTICAL", gap: 6, width: "FILL" });
    passwordGroup.appendChild(createText({ text: "\uBE44\uBC00\uBC88\uD638", size: 13, weight: 500, color: COLORS.neutral700 }));
    const passwordInput = createAutoLayoutFrame({
      name: "Input",
      direction: "HORIZONTAL",
      width: "FILL",
      height: 44,
      padding: { top: 10, right: 14, bottom: 10, left: 14 },
      fill: COLORS.neutral50,
      cornerRadius: RADIUS.sm,
      stroke: COLORS.neutral300
    });
    passwordInput.appendChild(createText({ text: "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022", size: 14, color: COLORS.neutral500 }));
    passwordGroup.appendChild(passwordInput);
    formCard.appendChild(passwordGroup);
    const loginBtn = createAutoLayoutFrame({
      name: "Login Button",
      direction: "HORIZONTAL",
      width: "FILL",
      height: 44,
      fill: COLORS.primary,
      cornerRadius: RADIUS.sm
    });
    loginBtn.primaryAxisAlignItems = "CENTER";
    loginBtn.counterAxisAlignItems = "CENTER";
    loginBtn.appendChild(createText({ text: "\uB85C\uADF8\uC778", size: 15, weight: 600, color: COLORS.white }));
    formCard.appendChild(loginBtn);
    rightPanel.appendChild(formCard);
    root.appendChild(rightPanel);
    finalize(root);
    return [root];
  }

  // src/screens/dashboard.ts
  async function generateDashboard() {
    const { root, content } = buildAppShell("Dashboard");
    const kpiRow = createAutoLayoutFrame({
      name: "KPI Cards",
      direction: "HORIZONTAL",
      width: "FILL",
      gap: 16
    });
    const kpis = [
      { label: "\uCD1D \uB300\uD654", value: "1,247", change: "\u2191 12%", changeColor: COLORS.success, icon: "\u{1F4AC}" },
      { label: "AI \uD574\uACB0\uB960", value: "73%", change: "\u2191 5%", changeColor: COLORS.success, icon: "\u{1F916}" },
      { label: "\uD3C9\uADE0 \uC751\uB2F5 \uC2DC\uAC04", value: "2.3s", change: "\u2193 0.5s", changeColor: COLORS.success, icon: "\u26A1" },
      { label: "\uC5D0\uC2A4\uCEEC\uB808\uC774\uC158", value: "342", change: "\u2193 8%", changeColor: COLORS.danger, icon: "\u{1F514}" }
    ];
    for (const kpi of kpis) {
      const card = createAutoLayoutFrame({
        name: `KPI - ${kpi.label}`,
        direction: "VERTICAL",
        width: "FILL",
        padding: SPACING.base,
        gap: 8,
        fill: COLORS.white,
        cornerRadius: RADIUS.md,
        stroke: COLORS.neutral300
      });
      const cardHeader = createAutoLayoutFrame({ name: "Card Header", direction: "HORIZONTAL", width: "FILL", gap: 8 });
      cardHeader.primaryAxisAlignItems = "SPACE_BETWEEN";
      cardHeader.appendChild(createText({ text: kpi.label, size: 13, weight: 500, color: COLORS.neutral500 }));
      cardHeader.appendChild(createText({ text: kpi.icon, size: 18 }));
      card.appendChild(cardHeader);
      card.appendChild(createText({ text: kpi.value, size: 32, weight: 700, color: COLORS.neutral900 }));
      const changeRow = createAutoLayoutFrame({ name: "Change", direction: "HORIZONTAL", gap: 4 });
      changeRow.counterAxisAlignItems = "CENTER";
      changeRow.appendChild(createText({ text: kpi.change, size: 12, weight: 500, color: kpi.changeColor }));
      changeRow.appendChild(createText({ text: "\uC804\uC77C \uB300\uBE44", size: 12, color: COLORS.neutral500 }));
      card.appendChild(changeRow);
      kpiRow.appendChild(card);
    }
    content.appendChild(kpiRow);
    const chartsRow = createAutoLayoutFrame({
      name: "Charts Row",
      direction: "HORIZONTAL",
      width: "FILL",
      gap: 16
    });
    const trendChart = createAutoLayoutFrame({
      name: "Trend Chart",
      direction: "VERTICAL",
      width: "FILL",
      padding: SPACING.base,
      gap: 12,
      fill: COLORS.white,
      cornerRadius: RADIUS.md,
      stroke: COLORS.neutral300
    });
    trendChart.appendChild(createText({ text: "\uC77C\uBCC4 \uCD94\uC774", size: 16, weight: 600, color: COLORS.neutral900 }));
    const legendRow = createAutoLayoutFrame({ name: "Legend", direction: "HORIZONTAL", gap: 16 });
    const legend1 = createAutoLayoutFrame({ name: "L1", direction: "HORIZONTAL", gap: 6 });
    legend1.counterAxisAlignItems = "CENTER";
    const l1dot = figma.createRectangle();
    l1dot.resize(12, 3);
    l1dot.fills = [solidPaint(COLORS.primary)];
    l1dot.cornerRadius = 2;
    legend1.appendChild(l1dot);
    legend1.appendChild(createText({ text: "\uCD1D \uB300\uD654", size: 12, color: COLORS.neutral500 }));
    legendRow.appendChild(legend1);
    const legend2 = createAutoLayoutFrame({ name: "L2", direction: "HORIZONTAL", gap: 6 });
    legend2.counterAxisAlignItems = "CENTER";
    const l2dot = figma.createRectangle();
    l2dot.resize(12, 3);
    l2dot.fills = [solidPaint(COLORS.danger)];
    l2dot.cornerRadius = 2;
    legend2.appendChild(l2dot);
    legend2.appendChild(createText({ text: "\uC5D0\uC2A4\uCEEC\uB808\uC774\uC158", size: 12, color: COLORS.neutral500 }));
    legendRow.appendChild(legend2);
    trendChart.appendChild(legendRow);
    trendChart.appendChild(createPlaceholder("Line Chart", 500, 200, COLORS.neutral100));
    chartsRow.appendChild(trendChart);
    const catChart = createAutoLayoutFrame({
      name: "Category Chart",
      direction: "VERTICAL",
      width: 360,
      padding: SPACING.base,
      gap: 12,
      fill: COLORS.white,
      cornerRadius: RADIUS.md,
      stroke: COLORS.neutral300
    });
    catChart.appendChild(createText({ text: "\uCE74\uD14C\uACE0\uB9AC \uBD84\uD3EC", size: 16, weight: 600, color: COLORS.neutral900 }));
    catChart.appendChild(createPlaceholder("Donut Chart", 328, 180, COLORS.neutral100));
    const catItems = [
      { label: "\uACB0\uC81C", pct: "35%", color: COLORS.primary },
      { label: "\uBC30\uC1A1", pct: "25%", color: COLORS.success },
      { label: "\uAE30\uC220", pct: "20%", color: COLORS.warning },
      { label: "\uAE30\uD0C0", pct: "20%", color: COLORS.neutral500 }
    ];
    for (const item of catItems) {
      const row = createAutoLayoutFrame({ name: `Cat - ${item.label}`, direction: "HORIZONTAL", gap: 8, width: "FILL" });
      row.primaryAxisAlignItems = "SPACE_BETWEEN";
      row.counterAxisAlignItems = "CENTER";
      const left = createAutoLayoutFrame({ name: "Left", direction: "HORIZONTAL", gap: 6 });
      left.counterAxisAlignItems = "CENTER";
      const colorDot = figma.createRectangle();
      colorDot.resize(10, 10);
      colorDot.fills = [solidPaint(item.color)];
      colorDot.cornerRadius = 2;
      left.appendChild(colorDot);
      left.appendChild(createText({ text: item.label, size: 13, color: COLORS.neutral700 }));
      row.appendChild(left);
      row.appendChild(createText({ text: item.pct, size: 13, weight: 600, color: COLORS.neutral900 }));
      catChart.appendChild(row);
    }
    chartsRow.appendChild(catChart);
    content.appendChild(chartsRow);
    const escSection = createAutoLayoutFrame({
      name: "Recent Escalations",
      direction: "VERTICAL",
      width: "FILL",
      padding: SPACING.base,
      gap: 12,
      fill: COLORS.white,
      cornerRadius: RADIUS.md,
      stroke: COLORS.neutral300
    });
    const escHeader = createAutoLayoutFrame({ name: "Section Header", direction: "HORIZONTAL", width: "FILL" });
    escHeader.primaryAxisAlignItems = "SPACE_BETWEEN";
    escHeader.counterAxisAlignItems = "CENTER";
    escHeader.appendChild(createText({ text: "\uCD5C\uADFC \uC5D0\uC2A4\uCEEC\uB808\uC774\uC158", size: 16, weight: 600, color: COLORS.neutral900 }));
    escHeader.appendChild(createText({ text: "\uC804\uCCB4 \uBCF4\uAE30 \u2192", size: 13, weight: 500, color: COLORS.primary }));
    escSection.appendChild(escHeader);
    const escalations = [
      { name: "\uD64D\uAE38\uB3D9", topic: "\uACB0\uC81C \uC624\uB958 \u2014 PG \uD0C0\uC784\uC544\uC6C3 \uC758\uC2EC", time: "5\uBD84 \uC804", status: "ESCALATED" },
      { name: "\uAE40\uCCA0\uC218", topic: "\uBC30\uC1A1 \uC9C0\uC5F0 \u2014 3\uC77C \uCD08\uACFC", time: "12\uBD84 \uC804", status: "ESCALATED" },
      { name: "\uC774\uC601\uD76C", topic: "\uB85C\uADF8\uC778 \uBD88\uAC00 \u2014 \uBE44\uBC00\uBC88\uD638 \uC7AC\uC124\uC815 \uC2E4\uD328", time: "25\uBD84 \uC804", status: "ACTIVE" }
    ];
    for (const esc of escalations) {
      const row = createAutoLayoutFrame({
        name: `Esc - ${esc.name}`,
        direction: "HORIZONTAL",
        width: "FILL",
        padding: { top: 10, right: 12, bottom: 10, left: 12 },
        gap: 12,
        cornerRadius: RADIUS.sm
      });
      row.counterAxisAlignItems = "CENTER";
      row.primaryAxisAlignItems = "SPACE_BETWEEN";
      const left = createAutoLayoutFrame({ name: "Left", direction: "HORIZONTAL", gap: 12 });
      left.counterAxisAlignItems = "CENTER";
      left.appendChild(createText({ text: esc.name, size: 14, weight: 600, color: COLORS.neutral900 }));
      left.appendChild(createText({ text: esc.topic, size: 13, color: COLORS.neutral700 }));
      row.appendChild(left);
      const right = createAutoLayoutFrame({ name: "Right", direction: "HORIZONTAL", gap: 12 });
      right.counterAxisAlignItems = "CENTER";
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

  // src/screens/conversation-list.ts
  async function generateConversationList() {
    const { root, content } = buildAppShell("\uB300\uD654 \uAD00\uB9AC");
    const filterBar = createAutoLayoutFrame({
      name: "Filter Bar",
      direction: "HORIZONTAL",
      width: "FILL",
      gap: 12
    });
    filterBar.counterAxisAlignItems = "CENTER";
    const searchInput = createAutoLayoutFrame({
      name: "Search Input",
      direction: "HORIZONTAL",
      width: "FILL",
      height: 40,
      padding: { top: 8, right: 14, bottom: 8, left: 14 },
      fill: COLORS.white,
      cornerRadius: RADIUS.sm,
      stroke: COLORS.neutral300
    });
    searchInput.counterAxisAlignItems = "CENTER";
    searchInput.appendChild(createText({ text: "\u{1F50D}  \uACE0\uAC1D\uBA85, \uC774\uBA54\uC77C, \uB300\uD654 \uB0B4\uC6A9 \uAC80\uC0C9...", size: 14, color: COLORS.neutral500 }));
    filterBar.appendChild(searchInput);
    const filters = ["\uC0C1\uD0DC \u25BC", "\uAE30\uAC04 \u25BC", "AI \uD574\uACB0 \u25BC"];
    for (const f of filters) {
      const btn = createAutoLayoutFrame({
        name: `Filter - ${f}`,
        direction: "HORIZONTAL",
        height: 40,
        padding: { top: 8, right: 14, bottom: 8, left: 14 },
        fill: COLORS.white,
        cornerRadius: RADIUS.sm,
        stroke: COLORS.neutral300
      });
      btn.counterAxisAlignItems = "CENTER";
      btn.appendChild(createText({ text: f, size: 13, weight: 500, color: COLORS.neutral700 }));
      filterBar.appendChild(btn);
    }
    content.appendChild(filterBar);
    const table = createAutoLayoutFrame({
      name: "Conversation Table",
      direction: "VERTICAL",
      width: "FILL",
      fill: COLORS.white,
      cornerRadius: RADIUS.md,
      stroke: COLORS.neutral300
    });
    const headerRow = createAutoLayoutFrame({
      name: "Table Header",
      direction: "HORIZONTAL",
      width: "FILL",
      height: 44,
      fill: COLORS.neutral50,
      padding: { top: 0, right: 16, bottom: 0, left: 16 },
      gap: 0
    });
    headerRow.counterAxisAlignItems = "CENTER";
    const colWidths = [240, 280, 100, 100, 80, 80];
    const colNames = ["\uACE0\uAC1D", "\uC8FC\uC81C", "\uC0C1\uD0DC", "\uC2DC\uAC04", "AI \uD574\uACB0", "\uBA54\uC2DC\uC9C0"];
    for (let i = 0; i < colNames.length; i++) {
      const col = createAutoLayoutFrame({ name: `Col - ${colNames[i]}`, direction: "HORIZONTAL", width: colWidths[i], height: "FILL" });
      col.counterAxisAlignItems = "CENTER";
      col.appendChild(createText({ text: colNames[i], size: 12, weight: 600, color: COLORS.neutral500 }));
      headerRow.appendChild(col);
    }
    table.appendChild(headerRow);
    const rows = [
      { name: "\uD64D\uAE38\uB3D9", email: "hong@email.com", topic: "\uACB0\uC81C \uC624\uB958 \u2014 \uCE74\uB4DC \uACB0\uC81C \uC2DC \uD0C0\uC784\uC544\uC6C3 \uBC1C\uC0DD", status: "ESCALATED", time: "5\uBD84 \uC804", ai: "\u274C", msgs: "8" },
      { name: "\uAE40\uCCA0\uC218", email: "kim@email.com", topic: "\uBC30\uC1A1 \uBB38\uC758 \u2014 \uC8FC\uBB38 \uD6C4 3\uC77C \uACBD\uACFC, \uBC30\uC1A1 \uC2DC\uC791 \uC548\uB428", status: "RESOLVED", time: "1\uC2DC\uAC04 \uC804", ai: "\u2705", msgs: "4" },
      { name: "\uC774\uC601\uD76C", email: "lee@email.com", topic: "\uB85C\uADF8\uC778 \uBD88\uAC00 \u2014 \uBE44\uBC00\uBC88\uD638 \uC7AC\uC124\uC815 \uC774\uBA54\uC77C \uBBF8\uC218\uC2E0", status: "ACTIVE", time: "2\uC2DC\uAC04 \uC804", ai: "\u274C", msgs: "12" },
      { name: "\uBC15\uBBFC\uC218", email: "park@email.com", topic: "\uD658\uBD88 \uC694\uCCAD \u2014 \uC0C1\uD488 \uBD88\uB7C9\uC73C\uB85C \uD658\uBD88 \uCC98\uB9AC \uC694\uCCAD", status: "RESOLVED", time: "3\uC2DC\uAC04 \uC804", ai: "\u2705", msgs: "6" },
      { name: "\uC815\uC218\uC9C4", email: "jung@email.com", topic: "\uCFE0\uD3F0 \uC801\uC6A9 \uC548\uB428 \u2014 \uD560\uC778 \uCF54\uB4DC \uC785\uB825 \uC2DC \uC624\uB958", status: "CLOSED", time: "5\uC2DC\uAC04 \uC804", ai: "\u2705", msgs: "3" },
      { name: "\uCD5C\uB3D9\uD601", email: "choi@email.com", topic: "\uC0C1\uD488 \uBB38\uC758 \u2014 \uC7AC\uACE0 \uD655\uC778 \uBC0F \uC785\uACE0 \uC77C\uC815", status: "ACTIVE", time: "6\uC2DC\uAC04 \uC804", ai: "\u274C", msgs: "10" },
      { name: "\uAC15\uC11C\uC5F0", email: "kang@email.com", topic: "\uD68C\uC6D0 \uD0C8\uD1F4 \u2014 \uACC4\uC815 \uC0AD\uC81C \uC808\uCC28 \uBB38\uC758", status: "RESOLVED", time: "1\uC77C \uC804", ai: "\u2705", msgs: "5" }
    ];
    for (const row of rows) {
      const dataRow = createAutoLayoutFrame({
        name: `Row - ${row.name}`,
        direction: "HORIZONTAL",
        width: "FILL",
        height: 56,
        padding: { top: 0, right: 16, bottom: 0, left: 16 },
        stroke: COLORS.neutral100
      });
      dataRow.counterAxisAlignItems = "CENTER";
      const custCol = createAutoLayoutFrame({ name: "Customer", direction: "VERTICAL", width: 240, gap: 2 });
      custCol.appendChild(createText({ text: row.name, size: 14, weight: 500, color: COLORS.neutral900 }));
      custCol.appendChild(createText({ text: row.email, size: 12, color: COLORS.neutral500 }));
      dataRow.appendChild(custCol);
      const topicCol = createAutoLayoutFrame({ name: "Topic", direction: "HORIZONTAL", width: 280 });
      topicCol.counterAxisAlignItems = "CENTER";
      topicCol.appendChild(createText({ text: row.topic, size: 13, color: COLORS.neutral700, width: 270 }));
      dataRow.appendChild(topicCol);
      const statusCol = createAutoLayoutFrame({ name: "Status", direction: "HORIZONTAL", width: 100 });
      statusCol.counterAxisAlignItems = "CENTER";
      const st = CONVERSATION_STATUS[row.status];
      statusCol.appendChild(createBadge(st.label, st.bg, st.text));
      dataRow.appendChild(statusCol);
      const timeCol = createAutoLayoutFrame({ name: "Time", direction: "HORIZONTAL", width: 100 });
      timeCol.counterAxisAlignItems = "CENTER";
      timeCol.appendChild(createText({ text: row.time, size: 13, color: COLORS.neutral500 }));
      dataRow.appendChild(timeCol);
      const aiCol = createAutoLayoutFrame({ name: "AI", direction: "HORIZONTAL", width: 80 });
      aiCol.counterAxisAlignItems = "CENTER";
      aiCol.primaryAxisAlignItems = "CENTER";
      aiCol.appendChild(createText({ text: row.ai, size: 16 }));
      dataRow.appendChild(aiCol);
      const msgCol = createAutoLayoutFrame({ name: "Msgs", direction: "HORIZONTAL", width: 80 });
      msgCol.counterAxisAlignItems = "CENTER";
      msgCol.primaryAxisAlignItems = "CENTER";
      msgCol.appendChild(createText({ text: row.msgs, size: 13, weight: 500, color: COLORS.neutral700 }));
      dataRow.appendChild(msgCol);
      table.appendChild(dataRow);
    }
    content.appendChild(table);
    const pagination = createAutoLayoutFrame({
      name: "Pagination",
      direction: "HORIZONTAL",
      width: "FILL",
      gap: 8
    });
    pagination.primaryAxisAlignItems = "CENTER";
    pagination.counterAxisAlignItems = "CENTER";
    pagination.appendChild(createText({ text: "\uCD1D 342\uAC74", size: 13, color: COLORS.neutral500 }));
    const pageNums = ["< ", "1", "2", "3", "...", "18", " >"];
    for (const p of pageNums) {
      const pageBtn = createAutoLayoutFrame({
        name: `Page ${p}`,
        direction: "HORIZONTAL",
        width: 32,
        height: 32,
        fill: p === "1" ? COLORS.primary : COLORS.white,
        cornerRadius: RADIUS.sm,
        stroke: p === "1" ? void 0 : COLORS.neutral300
      });
      pageBtn.primaryAxisAlignItems = "CENTER";
      pageBtn.counterAxisAlignItems = "CENTER";
      pageBtn.appendChild(createText({ text: p, size: 13, weight: 500, color: p === "1" ? COLORS.white : COLORS.neutral700 }));
      pagination.appendChild(pageBtn);
    }
    content.appendChild(pagination);
    finalize(root);
    return [root];
  }

  // src/screens/conversation-detail.ts
  async function generateConversationDetail() {
    const { root, content } = buildAppShell("\uB300\uD654 \uC0C1\uC138");
    content.layoutMode = "HORIZONTAL";
    content.itemSpacing = 0;
    content.paddingTop = 0;
    content.paddingRight = 0;
    content.paddingBottom = 0;
    content.paddingLeft = 0;
    const chatPanel = createAutoLayoutFrame({
      name: "Chat Log Panel",
      direction: "VERTICAL",
      width: "FILL",
      height: "FILL"
    });
    const backNav = createAutoLayoutFrame({
      name: "Back Nav",
      direction: "HORIZONTAL",
      width: "FILL",
      height: 44,
      padding: { top: 8, right: 16, bottom: 8, left: 16 },
      gap: 8,
      stroke: COLORS.neutral300
    });
    backNav.counterAxisAlignItems = "CENTER";
    backNav.appendChild(createText({ text: "\u2190 \uBAA9\uB85D\uC73C\uB85C", size: 14, weight: 500, color: COLORS.primary }));
    backNav.appendChild(createText({ text: "\uB300\uD654 #C-20260313-001", size: 14, weight: 600, color: COLORS.neutral900 }));
    chatPanel.appendChild(backNav);
    const messages = createAutoLayoutFrame({
      name: "Messages",
      direction: "VERTICAL",
      width: "FILL",
      height: "FILL",
      fill: COLORS.neutral50,
      padding: 16,
      gap: 12
    });
    const aiMsg1 = buildMessage("AI", "\uC548\uB155\uD558\uC138\uC694! AI \uC0C1\uB2F4 \uB3C4\uC6B0\uBBF8\uC785\uB2C8\uB2E4.\n\uC5B4\uB5A4 \uBB38\uC81C\uAC00 \uC788\uC73C\uC2E0\uAC00\uC694?", "\uC624\uD6C4 2:30", COLORS.white, COLORS.neutral300);
    messages.appendChild(aiMsg1);
    const custMsg1 = buildCustomerMessage("\uACB0\uC81C\uAC00 \uC548 \uB3FC\uC694. \uCE74\uB4DC \uACB0\uC81C \uC2DC \uC624\uB958\uAC00 \uBC1C\uC0DD\uD569\uB2C8\uB2E4.", "\uC624\uD6C4 2:31");
    messages.appendChild(custMsg1);
    const aiMsg2 = buildMessage("AI", "\uACB0\uC81C \uC624\uB958\uAC00 \uBC1C\uC0DD\uD558\uC168\uAD70\uC694.\n\uC5B4\uB5A4 \uACB0\uC81C \uC218\uB2E8\uC744 \uC0AC\uC6A9\uD558\uC168\uB098\uC694?", "\uC624\uD6C4 2:31", COLORS.white, COLORS.neutral300);
    messages.appendChild(aiMsg2);
    const custMsg2 = buildCustomerMessage("\uC2E0\uC6A9\uCE74\uB4DC\uB85C \uACB0\uC81C\uD558\uB824\uACE0 \uD588\uC5B4\uC694. \uC0BC\uC131\uCE74\uB4DC\uC778\uB370 \uACC4\uC18D \uD0C0\uC784\uC544\uC6C3 \uC5D0\uB7EC\uAC00 \uB098\uC694.", "\uC624\uD6C4 2:32");
    messages.appendChild(custMsg2);
    const aiMsg3 = buildMessage("AI", "\uC0BC\uC131\uCE74\uB4DC \uACB0\uC81C \uC2DC \uD0C0\uC784\uC544\uC6C3\uC774 \uBC1C\uC0DD\uD558\uB294 \uC0C1\uD669\uC774\uC2DC\uAD70\uC694.\n\uBA87 \uAC00\uC9C0 \uD655\uC778\uD574 \uBCFC\uAC8C\uC694:\n1. \uCE74\uB4DC \uD55C\uB3C4\uB97C \uD655\uC778\uD574 \uC8FC\uC138\uC694\n2. \uC571 \uBC84\uC804\uC774 \uCD5C\uC2E0\uC778\uC9C0 \uD655\uC778\uD574 \uC8FC\uC138\uC694\n3. \uB2E4\uB978 \uBE0C\uB77C\uC6B0\uC800\uC5D0\uC11C\uB3C4 \uB3D9\uC77C\uD55C\uC9C0 \uD655\uC778\uD574 \uC8FC\uC138\uC694", "\uC624\uD6C4 2:32", COLORS.white, COLORS.neutral300);
    messages.appendChild(aiMsg3);
    const sysMsg = createAutoLayoutFrame({ name: "System Message", direction: "HORIZONTAL", width: "FILL", gap: 8 });
    sysMsg.primaryAxisAlignItems = "CENTER";
    sysMsg.counterAxisAlignItems = "CENTER";
    const line1 = createAutoLayoutFrame({ name: "Line", direction: "HORIZONTAL", width: "FILL", height: 1, fill: COLORS.neutral300 });
    const sysText = createText({ text: "\uC5D0\uC2A4\uCEEC\uB808\uC774\uC158 \u2014 \uB2F4\uB2F9\uC790\uC5D0\uAC8C \uC804\uB2EC\uB428", size: 12, weight: 500, color: COLORS.neutral500 });
    const line2 = createAutoLayoutFrame({ name: "Line", direction: "HORIZONTAL", width: "FILL", height: 1, fill: COLORS.neutral300 });
    sysMsg.appendChild(line1);
    sysMsg.appendChild(sysText);
    sysMsg.appendChild(line2);
    messages.appendChild(sysMsg);
    const adminMsg = buildMessage("\uC0C1\uB2F4\uC0AC", "\uC548\uB155\uD558\uC138\uC694, \uB2F4\uB2F9\uC790 \uAE40\uAD00\uB9AC\uC785\uB2C8\uB2E4.\n\uD604\uC7AC \uC0BC\uC131\uCE74\uB4DC PG \uC5F0\uB3D9\uC5D0 \uC77C\uC2DC\uC801 \uC7A5\uC560\uAC00 \uD655\uC778\uB418\uC5C8\uC2B5\uB2C8\uB2E4.\n30\uBD84 \uB0B4 \uBCF5\uAD6C \uC608\uC815\uC774\uBA70, \uBCF5\uAD6C \uD6C4 \uACB0\uC81C \uC7AC\uC2DC\uB3C4 \uBD80\uD0C1\uB4DC\uB9BD\uB2C8\uB2E4.", "\uC624\uD6C4 2:45", COLORS.successLight, COLORS.successBorder, true);
    messages.appendChild(adminMsg);
    chatPanel.appendChild(messages);
    const adminInput = createAutoLayoutFrame({
      name: "Admin Input",
      direction: "HORIZONTAL",
      width: "FILL",
      height: 56,
      fill: COLORS.white,
      padding: { top: 10, right: 12, bottom: 10, left: 16 },
      gap: 8,
      stroke: COLORS.neutral300
    });
    adminInput.counterAxisAlignItems = "CENTER";
    const inputField = createAutoLayoutFrame({ name: "Input", direction: "HORIZONTAL", width: "FILL", height: 36, padding: { top: 8, right: 12, bottom: 8, left: 12 } });
    inputField.appendChild(createText({ text: "\uAD00\uB9AC\uC790 \uBA54\uC2DC\uC9C0 \uC785\uB825...", size: 14, color: COLORS.neutral500 }));
    adminInput.appendChild(inputField);
    const sendBtn = createAutoLayoutFrame({
      name: "Send",
      direction: "HORIZONTAL",
      height: 36,
      padding: { top: 8, right: 16, bottom: 8, left: 16 },
      fill: COLORS.success,
      cornerRadius: RADIUS.sm
    });
    sendBtn.counterAxisAlignItems = "CENTER";
    sendBtn.appendChild(createText({ text: "\uC804\uC1A1", size: 14, weight: 600, color: COLORS.white }));
    adminInput.appendChild(sendBtn);
    chatPanel.appendChild(adminInput);
    content.appendChild(chatPanel);
    const infoPanel = createAutoLayoutFrame({
      name: "Info Panel",
      direction: "VERTICAL",
      width: 340,
      height: "FILL",
      fill: COLORS.white,
      padding: SPACING.base,
      gap: 20,
      stroke: COLORS.neutral300
    });
    const custSection = createAutoLayoutFrame({ name: "Customer Info", direction: "VERTICAL", width: "FILL", gap: 8 });
    custSection.appendChild(createText({ text: "\uACE0\uAC1D \uC815\uBCF4", size: 14, weight: 600, color: COLORS.neutral900 }));
    const infoRows = [
      { label: "\uC774\uB984", value: "\uD64D\uAE38\uB3D9" },
      { label: "\uC774\uBA54\uC77C", value: "hong@email.com" }
    ];
    for (const info of infoRows) {
      const row = createAutoLayoutFrame({ name: `Info - ${info.label}`, direction: "HORIZONTAL", width: "FILL", gap: 8 });
      row.primaryAxisAlignItems = "SPACE_BETWEEN";
      row.appendChild(createText({ text: info.label, size: 13, color: COLORS.neutral500 }));
      row.appendChild(createText({ text: info.value, size: 13, weight: 500, color: COLORS.neutral900 }));
      custSection.appendChild(row);
    }
    infoPanel.appendChild(custSection);
    const convSection = createAutoLayoutFrame({ name: "Conversation Info", direction: "VERTICAL", width: "FILL", gap: 8 });
    convSection.appendChild(createText({ text: "\uB300\uD654 \uC815\uBCF4", size: 14, weight: 600, color: COLORS.neutral900 }));
    const convStatusRow = createAutoLayoutFrame({ name: "Status Row", direction: "HORIZONTAL", width: "FILL" });
    convStatusRow.primaryAxisAlignItems = "SPACE_BETWEEN";
    convStatusRow.counterAxisAlignItems = "CENTER";
    convStatusRow.appendChild(createText({ text: "\uC0C1\uD0DC", size: 13, color: COLORS.neutral500 }));
    convStatusRow.appendChild(createBadge("\uC5D0\uC2A4\uCEEC\uB808\uC774\uC158", "#FFFBEB", "#92400E"));
    convSection.appendChild(convStatusRow);
    const convDetails = [
      { label: "\uB300\uD654 \uC2DC\uC791", value: "2026-03-13 14:30" },
      { label: "\uCD1D \uBA54\uC2DC\uC9C0", value: "6" },
      { label: "AI \uC2DC\uB3C4", value: "3\uD68C" },
      { label: "\uD3C9\uADE0 confidence", value: "0.48" }
    ];
    for (const d of convDetails) {
      const row = createAutoLayoutFrame({ name: `Detail - ${d.label}`, direction: "HORIZONTAL", width: "FILL" });
      row.primaryAxisAlignItems = "SPACE_BETWEEN";
      row.appendChild(createText({ text: d.label, size: 13, color: COLORS.neutral500 }));
      row.appendChild(createText({ text: d.value, size: 13, weight: 500, color: COLORS.neutral900 }));
      convSection.appendChild(row);
    }
    infoPanel.appendChild(convSection);
    const actSection = createAutoLayoutFrame({ name: "Actions", direction: "VERTICAL", width: "FILL", gap: 8 });
    actSection.appendChild(createText({ text: "\uC561\uC158", size: 14, weight: 600, color: COLORS.neutral900 }));
    const actionBtns = [
      { label: "\u{1F4AC} \uBA54\uC2DC\uC9C0 \uC804\uC1A1", bg: COLORS.primary, color: COLORS.white },
      { label: "\u2705 \uD574\uACB0 \uCC98\uB9AC", bg: COLORS.success, color: COLORS.white },
      { label: "\u{1F514} \uC7AC\uC5D0\uC2A4\uCEEC\uB808\uC774\uC158", bg: COLORS.white, color: COLORS.neutral700, stroke: COLORS.neutral300 }
    ];
    for (const ab of actionBtns) {
      const btn = createAutoLayoutFrame({
        name: `Action - ${ab.label}`,
        direction: "HORIZONTAL",
        width: "FILL",
        height: 40,
        fill: ab.bg,
        cornerRadius: RADIUS.sm,
        stroke: ab.stroke
      });
      btn.primaryAxisAlignItems = "CENTER";
      btn.counterAxisAlignItems = "CENTER";
      btn.appendChild(createText({ text: ab.label, size: 14, weight: 600, color: ab.color }));
      actSection.appendChild(btn);
    }
    infoPanel.appendChild(actSection);
    content.appendChild(infoPanel);
    finalize(root);
    return [root];
  }
  function buildMessage(sender, text, time, bg, stroke, isAdmin = false) {
    const row = createAutoLayoutFrame({ name: `${sender} Row`, direction: "HORIZONTAL", gap: 8, width: "FILL" });
    row.counterAxisAlignItems = "MIN";
    const avatarColor = isAdmin ? COLORS.successLight : COLORS.primaryLight;
    row.appendChild(createCircle(`${sender} Avatar`, 28, avatarColor));
    const col = createAutoLayoutFrame({ name: `${sender} Col`, direction: "VERTICAL", gap: 2 });
    if (isAdmin) {
      col.appendChild(createBadge("\uC0C1\uB2F4\uC0AC", COLORS.successLight, "#065F46"));
    }
    const bubble = createAutoLayoutFrame({
      name: `${sender} Bubble`,
      direction: "VERTICAL",
      padding: SPACING.md,
      gap: 4,
      fill: bg,
      cornerRadius: RADIUS.lg,
      stroke
    });
    bubble.resize(340, bubble.height);
    bubble.layoutSizingHorizontal = "FIXED";
    bubble.appendChild(createText({ text, size: 14, color: COLORS.neutral900, width: 316 }));
    bubble.appendChild(createText({ text: time, size: 12, color: COLORS.neutral500 }));
    col.appendChild(bubble);
    row.appendChild(col);
    return row;
  }
  function buildCustomerMessage(text, time) {
    const row = createAutoLayoutFrame({ name: "Customer Row", direction: "HORIZONTAL", gap: 8, width: "FILL" });
    row.primaryAxisAlignItems = "MAX";
    const bubble = createAutoLayoutFrame({
      name: "Customer Bubble",
      direction: "VERTICAL",
      padding: SPACING.md,
      gap: 4,
      fill: COLORS.primary,
      cornerRadius: RADIUS.lg
    });
    bubble.resize(300, bubble.height);
    bubble.layoutSizingHorizontal = "FIXED";
    bubble.appendChild(createText({ text, size: 14, color: COLORS.white, width: 276 }));
    bubble.appendChild(createText({ text: time, size: 12, color: "#93C5FD" }));
    row.appendChild(bubble);
    return row;
  }

  // src/screens/knowledge-base.ts
  async function generateKnowledgeBase() {
    const { root, content } = buildAppShell("Knowledge Base");
    const headerRow = createAutoLayoutFrame({
      name: "Page Header",
      direction: "HORIZONTAL",
      width: "FILL"
    });
    headerRow.primaryAxisAlignItems = "SPACE_BETWEEN";
    headerRow.counterAxisAlignItems = "CENTER";
    headerRow.appendChild(createText({ text: "Knowledge Base", size: 20, weight: 600, color: COLORS.neutral900 }));
    const addBtn = createAutoLayoutFrame({
      name: "Add Button",
      direction: "HORIZONTAL",
      height: 40,
      padding: { top: 8, right: 16, bottom: 8, left: 16 },
      fill: COLORS.primary,
      cornerRadius: RADIUS.sm,
      gap: 6
    });
    addBtn.counterAxisAlignItems = "CENTER";
    addBtn.appendChild(createText({ text: "+ \uC0C8 \uBB38\uC11C", size: 14, weight: 600, color: COLORS.white }));
    headerRow.appendChild(addBtn);
    content.appendChild(headerRow);
    const filterBar = createAutoLayoutFrame({
      name: "Filter Bar",
      direction: "HORIZONTAL",
      width: "FILL",
      gap: 12
    });
    filterBar.counterAxisAlignItems = "CENTER";
    const searchInput = createAutoLayoutFrame({
      name: "Search",
      direction: "HORIZONTAL",
      width: "FILL",
      height: 40,
      padding: { top: 8, right: 14, bottom: 8, left: 14 },
      fill: COLORS.white,
      cornerRadius: RADIUS.sm,
      stroke: COLORS.neutral300
    });
    searchInput.counterAxisAlignItems = "CENTER";
    searchInput.appendChild(createText({ text: "\u{1F50D}  \uBB38\uC11C \uAC80\uC0C9...", size: 14, color: COLORS.neutral500 }));
    filterBar.appendChild(searchInput);
    const catFilter = createAutoLayoutFrame({
      name: "Category Filter",
      direction: "HORIZONTAL",
      height: 40,
      padding: { top: 8, right: 14, bottom: 8, left: 14 },
      fill: COLORS.white,
      cornerRadius: RADIUS.sm,
      stroke: COLORS.neutral300
    });
    catFilter.counterAxisAlignItems = "CENTER";
    catFilter.appendChild(createText({ text: "\uCE74\uD14C\uACE0\uB9AC \u25BC", size: 13, weight: 500, color: COLORS.neutral700 }));
    filterBar.appendChild(catFilter);
    content.appendChild(filterBar);
    const articles = [
      { title: "\uACB0\uC81C \uC2E4\uD328 \uC2DC \uB300\uCC98 \uBC29\uBC95", category: "\uACB0\uC81C", tags: ["\uACB0\uC81C", "PG", "\uC624\uB958"], active: true, updated: "2026-03-10" },
      { title: "\uBC30\uC1A1 \uC9C0\uC5F0 \uC548\uB0B4 \uAC00\uC774\uB4DC", category: "\uBC30\uC1A1", tags: ["\uBC30\uC1A1", "\uD0DD\uBC30", "\uC9C0\uC5F0"], active: true, updated: "2026-03-08" },
      { title: "\uBE44\uBC00\uBC88\uD638 \uC7AC\uC124\uC815 \uC808\uCC28", category: "\uACC4\uC815", tags: ["\uACC4\uC815", "\uBE44\uBC00\uBC88\uD638", "\uB85C\uADF8\uC778"], active: false, updated: "2026-03-05" },
      { title: "\uD658\uBD88 \uBC0F \uAD50\uD658 \uC815\uCC45 \uC548\uB0B4", category: "\uC8FC\uBB38", tags: ["\uD658\uBD88", "\uAD50\uD658", "\uBC18\uD488"], active: true, updated: "2026-03-03" },
      { title: "\uCFE0\uD3F0 \uC0AC\uC6A9 \uBC29\uBC95 \uBC0F \uC8FC\uC758\uC0AC\uD56D", category: "\uD504\uB85C\uBAA8\uC158", tags: ["\uCFE0\uD3F0", "\uD560\uC778", "\uC801\uC6A9"], active: true, updated: "2026-02-28" }
    ];
    const cardList = createAutoLayoutFrame({
      name: "Article List",
      direction: "VERTICAL",
      width: "FILL",
      gap: 0,
      fill: COLORS.white,
      cornerRadius: RADIUS.md,
      stroke: COLORS.neutral300
    });
    for (const article of articles) {
      const card = createAutoLayoutFrame({
        name: `Article - ${article.title}`,
        direction: "HORIZONTAL",
        width: "FILL",
        padding: SPACING.base,
        gap: 12,
        stroke: COLORS.neutral100
      });
      card.counterAxisAlignItems = "CENTER";
      card.primaryAxisAlignItems = "SPACE_BETWEEN";
      const leftContent = createAutoLayoutFrame({ name: "Left", direction: "VERTICAL", width: "FILL", gap: 6 });
      const titleRow = createAutoLayoutFrame({ name: "Title Row", direction: "HORIZONTAL", gap: 8 });
      titleRow.counterAxisAlignItems = "CENTER";
      titleRow.appendChild(createText({ text: "\u{1F4C4}", size: 16 }));
      titleRow.appendChild(createText({ text: article.title, size: 14, weight: 600, color: COLORS.neutral900 }));
      leftContent.appendChild(titleRow);
      const metaRow = createAutoLayoutFrame({ name: "Meta", direction: "HORIZONTAL", gap: 8 });
      metaRow.counterAxisAlignItems = "CENTER";
      metaRow.appendChild(createBadge(article.category, COLORS.primaryLight, COLORS.primaryDark));
      for (const tag of article.tags) {
        metaRow.appendChild(createBadge(tag, COLORS.neutral100, COLORS.neutral500));
      }
      metaRow.appendChild(createText({ text: `|  \uC218\uC815\uC77C: ${article.updated}`, size: 12, color: COLORS.neutral500 }));
      leftContent.appendChild(metaRow);
      card.appendChild(leftContent);
      const statusBadge = createBadge(
        article.active ? "\uD65C\uC131 \u2705" : "\uBE44\uD65C\uC131 \u274C",
        article.active ? COLORS.successLight : COLORS.neutral100,
        article.active ? "#065F46" : COLORS.neutral500
      );
      card.appendChild(statusBadge);
      cardList.appendChild(card);
    }
    content.appendChild(cardList);
    const modal = createAutoLayoutFrame({
      name: "KB Edit Modal (Overlay)",
      direction: "VERTICAL",
      width: 560,
      padding: SPACING.lg,
      gap: 16,
      fill: COLORS.white,
      cornerRadius: RADIUS.lg
    });
    modal.strokes = [solidPaint(COLORS.neutral300)];
    modal.strokeWeight = 1;
    modal.effects = [{
      type: "DROP_SHADOW",
      color: { r: 0, g: 0, b: 0, a: 0.15 },
      offset: { x: 0, y: 10 },
      radius: 25,
      spread: 0,
      visible: true,
      blendMode: "NORMAL"
    }];
    modal.appendChild(createText({ text: "\u{1F4DD} Knowledge Base \uBB38\uC11C \uD3B8\uC9D1", size: 18, weight: 600, color: COLORS.neutral900 }));
    const titleGroup = createAutoLayoutFrame({ name: "Title Group", direction: "VERTICAL", gap: 6, width: "FILL" });
    titleGroup.appendChild(createText({ text: "\uC81C\uBAA9", size: 13, weight: 500, color: COLORS.neutral700 }));
    const titleInput = createAutoLayoutFrame({
      name: "Title Input",
      direction: "HORIZONTAL",
      width: "FILL",
      height: 40,
      padding: { top: 8, right: 14, bottom: 8, left: 14 },
      fill: COLORS.neutral50,
      cornerRadius: RADIUS.sm,
      stroke: COLORS.neutral300
    });
    titleInput.counterAxisAlignItems = "CENTER";
    titleInput.appendChild(createText({ text: "\uACB0\uC81C \uC2E4\uD328 \uC2DC \uB300\uCC98 \uBC29\uBC95", size: 14, color: COLORS.neutral900 }));
    titleGroup.appendChild(titleInput);
    modal.appendChild(titleGroup);
    const catTagRow = createAutoLayoutFrame({ name: "Cat Tag Row", direction: "HORIZONTAL", width: "FILL", gap: 12 });
    const catGroup = createAutoLayoutFrame({ name: "Category", direction: "VERTICAL", gap: 6, width: "FILL" });
    catGroup.appendChild(createText({ text: "\uCE74\uD14C\uACE0\uB9AC", size: 13, weight: 500, color: COLORS.neutral700 }));
    const catInput = createAutoLayoutFrame({
      name: "Cat Input",
      direction: "HORIZONTAL",
      width: "FILL",
      height: 40,
      padding: { top: 8, right: 14, bottom: 8, left: 14 },
      fill: COLORS.neutral50,
      cornerRadius: RADIUS.sm,
      stroke: COLORS.neutral300
    });
    catInput.counterAxisAlignItems = "CENTER";
    catInput.appendChild(createText({ text: "\uACB0\uC81C \u25BC", size: 14, color: COLORS.neutral900 }));
    catGroup.appendChild(catInput);
    catTagRow.appendChild(catGroup);
    const tagGroup = createAutoLayoutFrame({ name: "Tags", direction: "VERTICAL", gap: 6, width: "FILL" });
    tagGroup.appendChild(createText({ text: "\uD0DC\uADF8", size: 13, weight: 500, color: COLORS.neutral700 }));
    const tagRow = createAutoLayoutFrame({ name: "Tags Row", direction: "HORIZONTAL", gap: 6 });
    tagRow.appendChild(createBadge("\uACB0\uC81C", COLORS.primaryLight, COLORS.primaryDark));
    tagRow.appendChild(createBadge("\uC624\uB958", COLORS.primaryLight, COLORS.primaryDark));
    tagRow.appendChild(createBadge("PG", COLORS.primaryLight, COLORS.primaryDark));
    tagRow.appendChild(createBadge("+ \uCD94\uAC00", COLORS.neutral100, COLORS.neutral500));
    tagGroup.appendChild(tagRow);
    catTagRow.appendChild(tagGroup);
    modal.appendChild(catTagRow);
    const contentGroup = createAutoLayoutFrame({ name: "Content Group", direction: "VERTICAL", gap: 6, width: "FILL" });
    contentGroup.appendChild(createText({ text: "\uB0B4\uC6A9", size: 13, weight: 500, color: COLORS.neutral700 }));
    const contentInput = createAutoLayoutFrame({
      name: "Content Editor",
      direction: "VERTICAL",
      width: "FILL",
      height: 180,
      padding: 14,
      fill: COLORS.neutral50,
      cornerRadius: RADIUS.sm,
      stroke: COLORS.neutral300,
      gap: 8
    });
    contentInput.appendChild(createText({ text: "## \uACB0\uC81C \uC2E4\uD328 \uC6D0\uC778\n1. \uCE74\uB4DC \uD55C\uB3C4 \uCD08\uACFC\n2. \uB124\uD2B8\uC6CC\uD06C \uC624\uB958\n3. PG\uC0AC \uC810\uAC80 \uC2DC\uAC04\n\n## \uD574\uACB0 \uBC29\uBC95\n- \uB2E4\uB978 \uACB0\uC81C \uC218\uB2E8 \uC2DC\uB3C4\n- \uCE74\uB4DC\uC0AC \uD655\uC778\n- 10\uBD84 \uD6C4 \uC7AC\uC2DC\uB3C4", size: 13, color: COLORS.neutral700, width: 484 }));
    contentGroup.appendChild(contentInput);
    modal.appendChild(contentGroup);
    const toggleRow = createAutoLayoutFrame({ name: "Toggle Row", direction: "HORIZONTAL", width: "FILL", gap: 8 });
    toggleRow.counterAxisAlignItems = "CENTER";
    toggleRow.appendChild(createText({ text: "\uD65C\uC131 \uC0C1\uD0DC:", size: 13, weight: 500, color: COLORS.neutral700 }));
    const toggleBg = createAutoLayoutFrame({
      name: "Toggle",
      direction: "HORIZONTAL",
      width: 44,
      height: 24,
      fill: COLORS.success,
      cornerRadius: RADIUS.full,
      padding: { top: 2, right: 2, bottom: 2, left: 22 }
    });
    const toggleKnob = figma.createEllipse();
    toggleKnob.resize(20, 20);
    toggleKnob.fills = [solidPaint(COLORS.white)];
    toggleBg.appendChild(toggleKnob);
    toggleRow.appendChild(toggleBg);
    toggleRow.appendChild(createText({ text: "ON", size: 13, weight: 600, color: COLORS.success }));
    modal.appendChild(toggleRow);
    const infoNote = createAutoLayoutFrame({
      name: "Info Note",
      direction: "HORIZONTAL",
      width: "FILL",
      padding: SPACING.md,
      gap: 6,
      fill: COLORS.primaryLight,
      cornerRadius: RADIUS.sm
    });
    infoNote.counterAxisAlignItems = "CENTER";
    infoNote.appendChild(createText({ text: "\u2139\uFE0F", size: 14 }));
    infoNote.appendChild(createText({ text: "\uC800\uC7A5 \uC2DC \uC790\uB3D9\uC73C\uB85C \uBCA1\uD130 \uC784\uBCA0\uB529\uC774 \uC0DD\uC131\uB418\uC5B4 AI \uB2F5\uBCC0\uC5D0 \uBC18\uC601\uB429\uB2C8\uB2E4", size: 12, color: COLORS.primaryDark, width: 460 }));
    modal.appendChild(infoNote);
    const footerBtns = createAutoLayoutFrame({ name: "Footer", direction: "HORIZONTAL", width: "FILL", gap: 8 });
    footerBtns.primaryAxisAlignItems = "MAX";
    const cancelBtn = createAutoLayoutFrame({
      name: "Cancel",
      direction: "HORIZONTAL",
      height: 40,
      padding: { top: 8, right: 20, bottom: 8, left: 20 },
      fill: COLORS.white,
      cornerRadius: RADIUS.sm,
      stroke: COLORS.neutral300
    });
    cancelBtn.counterAxisAlignItems = "CENTER";
    cancelBtn.appendChild(createText({ text: "\uCDE8\uC18C", size: 14, weight: 500, color: COLORS.neutral700 }));
    const saveBtn = createAutoLayoutFrame({
      name: "Save",
      direction: "HORIZONTAL",
      height: 40,
      padding: { top: 8, right: 20, bottom: 8, left: 20 },
      fill: COLORS.primary,
      cornerRadius: RADIUS.sm
    });
    saveBtn.counterAxisAlignItems = "CENTER";
    saveBtn.appendChild(createText({ text: "\uC800\uC7A5\uD558\uAE30", size: 14, weight: 600, color: COLORS.white }));
    footerBtns.appendChild(cancelBtn);
    footerBtns.appendChild(saveBtn);
    modal.appendChild(footerBtns);
    finalize(root);
    finalize(modal);
    return [root, modal];
  }

  // src/code.ts
  figma.showUI(__html__, { width: 300, height: 480 });
  var screenGenerators = {
    "customer-chat": generateCustomerChat,
    "login": generateLogin,
    "dashboard": generateDashboard,
    "conversation-list": generateConversationList,
    "conversation-detail": generateConversationDetail,
    "knowledge-base": generateKnowledgeBase
  };
  var FRAME_GAP = 100;
  figma.ui.onmessage = async (msg) => {
    if (msg.type === "cancel") {
      figma.closePlugin();
      return;
    }
    if (msg.type === "generate" && msg.selections) {
      try {
        figma.ui.postMessage({ type: "progress", message: "Loading fonts..." });
        await loadFonts();
        let xPos = 0;
        for (const screen of msg.selections.screens) {
          const generator = screenGenerators[screen];
          if (generator) {
            figma.ui.postMessage({ type: "progress", message: `Generating ${screen}...` });
            const frames = await generator();
            for (const frame of frames) {
              frame.x = xPos;
              frame.y = 0;
              figma.currentPage.appendChild(frame);
              xPos += frame.width + FRAME_GAP;
            }
          }
        }
        const allNodes = figma.currentPage.children;
        if (allNodes.length > 0) {
          figma.viewport.scrollAndZoomIntoView([...allNodes]);
        }
        const total = msg.selections.screens.length;
        figma.ui.postMessage({ type: "done", message: `Done! ${total} screen(s) generated.` });
        figma.notify(`Generated ${total} screen(s).`);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        figma.ui.postMessage({ type: "done", message: `Error: ${message}` });
        figma.notify(`Error: ${message}`, { error: true });
      }
    }
  };
})();
