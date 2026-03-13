import { tool } from 'ai';
import { z } from 'zod';

export const weatherTool = tool({
  description: 'Get current weather for a location',
  inputSchema: z.object({
    location: z.string().describe('City name, e.g. "Buenos Aires"'),
  }),
  execute: async ({ location }) => {
    await new Promise(r => setTimeout(r, 1500));
    const conditions = ['Sunny', 'Cloudy', 'Rainy', 'Partly Cloudy', 'Stormy'];
    const condition = conditions[Math.floor(Math.random() * conditions.length)];
    const temp = Math.floor(Math.random() * 35) + 5;
    const humidity = Math.floor(Math.random() * 60) + 30;
    return {
      location,
      temperature: temp,
      unit: 'celsius',
      condition,
      humidity,
      wind: `${Math.floor(Math.random() * 30) + 5} km/h`,
    };
  },
});
