/**
 * Tool registry — the single place the engine discovers tools.
 * Add a tool here and it becomes available to the agent.
 */
import type { Tool } from "./types";
import { centerInfoTool } from "./center-info";
import { checkAvailabilityTool } from "./check-availability";
import { bookAppointmentTool } from "./book-appointment";
import { cancelAppointmentTool } from "./cancel-appointment";
import { joinWaitlistTool } from "./waitlist";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const TOOLS: Tool<any>[] = [
  centerInfoTool,
  checkAvailabilityTool,
  bookAppointmentTool,
  cancelAppointmentTool,
  joinWaitlistTool,
];

export const TOOLS_BY_NAME = new Map(TOOLS.map((t) => [t.name, t]));
