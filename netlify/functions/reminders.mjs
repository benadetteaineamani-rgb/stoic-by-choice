// Scheduled every 15 minutes: phone reminders and the daily automatic backup (02:00, last 30 days kept).
import { runScheduled } from "./api.mjs";
export default async () => { const r = await runScheduled(); console.log("scheduled", JSON.stringify(r)); };
export const config = { schedule: "*/15 * * * *" };
