import { loadFonts } from './utils/helpers';
import { generateCustomerChat } from './screens/customer-chat';
import { generateLogin } from './screens/login';
import { generateDashboard } from './screens/dashboard';
import { generateConversationList } from './screens/conversation-list';
import { generateConversationDetail } from './screens/conversation-detail';
import { generateKnowledgeBase } from './screens/knowledge-base';

figma.showUI(__html__, { width: 300, height: 480 });

interface Selections {
  screens: string[];
}

type Generator = () => Promise<FrameNode[]>;

const screenGenerators: Record<string, Generator> = {
  'customer-chat': generateCustomerChat,
  'login': generateLogin,
  'dashboard': generateDashboard,
  'conversation-list': generateConversationList,
  'conversation-detail': generateConversationDetail,
  'knowledge-base': generateKnowledgeBase,
};

const FRAME_GAP = 100;

figma.ui.onmessage = async (msg: { type: string; selections?: Selections }) => {
  if (msg.type === 'cancel') {
    figma.closePlugin();
    return;
  }

  if (msg.type === 'generate' && msg.selections) {
    try {
      figma.ui.postMessage({ type: 'progress', message: 'Loading fonts...' });
      await loadFonts();

      let xPos = 0;

      for (const screen of msg.selections.screens) {
        const generator = screenGenerators[screen];
        if (generator) {
          figma.ui.postMessage({ type: 'progress', message: `Generating ${screen}...` });
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
      figma.ui.postMessage({ type: 'done', message: `Done! ${total} screen(s) generated.` });
      figma.notify(`Generated ${total} screen(s).`);

    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      figma.ui.postMessage({ type: 'done', message: `Error: ${message}` });
      figma.notify(`Error: ${message}`, { error: true });
    }
  }
};
