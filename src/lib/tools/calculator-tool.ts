import { tool } from 'ai';
import { z } from 'zod';

export const calculatorTool = tool({
  description: 'Perform a math calculation',
  inputSchema: z.object({
    expression: z.string().describe('Math expression to evaluate, e.g. "2 + 2"'),
  }),
  execute: async ({ expression }) => {
    await new Promise(r => setTimeout(r, 800));
    try {
      const sanitized = expression.replace(/[^0-9+\-*/().%\s]/g, '');
      const result = new Function(`return (${sanitized})`)();
      return { expression, result: Number(result), success: true };
    } catch {
      return { expression, result: null, success: false, error: 'Invalid expression' };
    }
  },
});
