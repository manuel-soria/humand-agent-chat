import { createAgentUIStreamResponse } from 'ai';
import { chatAgent } from '@/lib/agents/chat-agent';

export const maxDuration = 120;

export async function POST(request: Request) {
  const { messages, instanceId, instanceName } = await request.json();

  // Inject instance context into the system via the first user message context
  const processedMessages = [...messages];
  if (instanceId && instanceName && processedMessages.length > 0) {
    const lastMsg = processedMessages[processedMessages.length - 1];
    if (lastMsg.role === 'user') {
      const contextPrefix = `[Contexto: Cliente seleccionado = "${instanceName}", instance_id = ${instanceId}. Usá este instance_id en todas las queries.]\n\n`;
      processedMessages[processedMessages.length - 1] = {
        ...lastMsg,
        parts: lastMsg.parts.map((part: { type: string; text: string }) =>
          part.type === 'text'
            ? { ...part, text: contextPrefix + part.text }
            : part,
        ),
      };
    }
  }

  return createAgentUIStreamResponse({
    agent: chatAgent,
    uiMessages: processedMessages,
  });
}
