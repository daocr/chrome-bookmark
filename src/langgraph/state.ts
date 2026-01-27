import { z } from "zod";
import { StateSchema, ReducedValue, MessagesValue } from "@langchain/langgraph";

export const AgentState = new StateSchema({
  messages: MessagesValue,
  count: z.number().default(0),
  history: new ReducedValue(
    z.array(z.string()).default(() => []),
    {
      inputSchema: z.string(),
      reducer: (current, next) => [...current, next],
    }
  ),
});
