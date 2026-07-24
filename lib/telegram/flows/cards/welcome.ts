/**
 * Welcome flow — registered user intro (same as menu with greeting).
 */
import { menuFlow } from './menu.ts';
import type { FlowContext, FlowInput, FlowOutput } from '../types.ts';

export function welcomeFlow(input: FlowInput, ctx: FlowContext): FlowOutput {
  const base = menuFlow(input, ctx);
  if (!ctx.node) return base;
  return {
    ...base,
    text: `👋 <b>Welcome, ${ctx.node.name}</b>\n\n${base.text}`,
  };
}
