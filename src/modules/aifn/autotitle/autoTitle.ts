import { aixChatGenerateText_Simple } from '~/modules/aix/client/aix.client';

import { excludeSystemMessages } from '~/common/stores/chat/chat.conversation';
import { getConversation, useChatStore } from '~/common/stores/chat/store-chats';
import { getDomainModelIdOrThrow } from '~/common/stores/llms/store-llms';
import { messageFragmentsReduceText } from '~/common/stores/chat/chat.message';


/** Derive a quick title from the first user message — no LLM needed. */
function titleFromFirstMessage(conversationId: string): string | null {
  const conversation = getConversation(conversationId);
  if (!conversation) return null;
  const firstUser = excludeSystemMessages(conversation.messages).find(m => m.role === 'user');
  if (!firstUser) return null;
  const text = messageFragmentsReduceText(firstUser.fragments).trim();
  if (!text) return null;
  // First line, capped at 60 chars
  const line = text.split('\n')[0]?.trim() ?? text;
  return line.length > 60 ? line.slice(0, 57) + '…' : line;
}


/**
 * Auto-titles a conversation:
 * 1. Immediately sets title from first user message (always works, no LLM needed).
 * 2. Refines with AI-generated title if a fast model is available.
 */
export async function autoConversationTitle(conversationId: string, forceReplace: boolean): Promise<boolean> {

  const conversation = getConversation(conversationId);
  if (!conversation) return false;

  // Skip if title already set (unless forced)
  if (!forceReplace && (conversation.autoTitle || conversation.userTitle))
    return false;

  const { setAutoTitle, setUserTitle } = useChatStore.getState();

  if (forceReplace) {
    setUserTitle(conversationId, '');
  }

  // Step 1: immediate fallback from first user message (always instant)
  const fallbackTitle = titleFromFirstMessage(conversationId);
  if (fallbackTitle && !forceReplace) {
    setAutoTitle(conversationId, fallbackTitle);
  } else if (forceReplace) {
    setAutoTitle(conversationId, '✏️…');
  }

  // Step 2: try to refine with AI
  let autoTitleLlmId: string;
  try {
    autoTitleLlmId = getDomainModelIdOrThrow(['fastUtil'], false, false, 'conversation-titler');
  } catch {
    // No fast model configured — fallback title is enough
    return !!fallbackTitle;
  }

  // first line of the last 5 messages
  const historyLines: string[] = excludeSystemMessages(conversation.messages).slice(-5).map(m => {
    const messageText = messageFragmentsReduceText(m.fragments);
    let text = messageText.split('\n')[0];
    text = text.length > 100 ? text.substring(0, 100) + '...' : text;
    text = `${m.role === 'user' ? 'You' : 'Assistant'}: ${text}`;
    return `- ${text}`;
  });

  try {
    let title = await aixChatGenerateText_Simple(
      autoTitleLlmId,
      'You are an AI conversation titles assistant who specializes in creating expressive yet few-words chat titles.',
      `Analyze the given short conversation (every line is truncated) and extract a concise chat title that summarizes the conversation in as little as a couple of words.
Only respond with the lowercase short title and nothing else.

\`\`\`
${historyLines.join('\n')}
\`\`\``,
      'chat-ai-title', conversationId,
    );

    title = title
      ?.trim()
      ?.replaceAll('"', '')
      ?.replace('Title: ', '')
      ?.replace('title: ', '');

    if (title) {
      setAutoTitle(conversationId, title);
      return true;
    }

  } catch (error: any) {
    console.log('Failed to AI-title conversation', conversationId, { error });
    if (forceReplace)
      setAutoTitle(conversationId, fallbackTitle ?? '');
  }

  return !!fallbackTitle;
}
