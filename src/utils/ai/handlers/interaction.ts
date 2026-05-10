export const interactionHandlers: Record<string, (args: Record<string, unknown>) => Promise<string>> = {
  ask_questions: async (args) => {
    return JSON.stringify({ _type: 'ask_questions', ...args })
  },

  suggest_solutions: async (args) => {
    return JSON.stringify({ _type: 'suggest_solutions', ...args })
  },
}
