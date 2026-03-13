import { tool } from 'ai';
import { z } from 'zod';

export const webSearchTool = tool({
  description: 'Search the web for information on a topic',
  inputSchema: z.object({
    query: z.string().describe('Search query'),
  }),
  execute: async ({ query }) => {
    await new Promise(r => setTimeout(r, 2000));
    return {
      query,
      results: [
        {
          title: `Top result for "${query}"`,
          snippet: `Comprehensive information about ${query}. This covers the latest developments and key facts.`,
          url: `https://example.com/search?q=${encodeURIComponent(query)}`,
        },
        {
          title: `${query} - Wikipedia`,
          snippet: `${query} refers to a widely discussed topic with multiple facets and interpretations.`,
          url: `https://en.wikipedia.org/wiki/${encodeURIComponent(query)}`,
        },
        {
          title: `Understanding ${query}`,
          snippet: `A deep dive into ${query}, exploring its origins, impact, and future implications.`,
          url: `https://example.com/deep-dive/${encodeURIComponent(query)}`,
        },
      ],
    };
  },
});
