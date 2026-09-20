import { DurableObject } from "cloudflare:workers";

interface Message {
  role: "system" | "user" | "assistant";
  content: string;
}

export class IncidentSession extends DurableObject {
  /**
   * Retrieves the current chat history array.
   */
  async get_history(): Promise<Message[]> {
    return await this.ctx.blockConcurrencyWhile(async () => {
      const history = await this.ctx.storage.get<Message[]>("history");
      return history || [];
    });
  }

  /**
   * Appends a new message to the chat history.
   * @param message The message to append.
   */
  async append_message(message: Message): Promise<void> {
    await this.ctx.blockConcurrencyWhile(async () => {
      const history = await this.ctx.storage.get<Message[]>("history") || [];
      history.push(message);
      await this.ctx.storage.put("history", history);
    });
  }

  /**
   * Clears the current session history.
   */
  async clear_session(): Promise<void> {
    await this.ctx.blockConcurrencyWhile(async () => {
      await this.ctx.storage.delete("history");
    });
  }
}
