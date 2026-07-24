/**
 * Template pack — HTML bodies + KeyboardSpec (labels via textKey).
 */
import { formatMoney } from '../flows/balances-snapshot.ts';
import type { KeyboardSpec } from '../flows/types.ts';
import { bold, code, escapeHtml } from './escape.ts';
import type { RenderedMessage, TemplateContext, TemplateId } from './types.ts';

function welcomeKeyboard(): KeyboardSpec {
  return {
    rows: [
      [
        { textKey: 'btn.status', callbackData: 'f:status' },
        { textKey: 'btn.balances', callbackData: 'f:balances' },
      ],
      [
        { textKey: 'btn.tree', callbackData: 'f:tree' },
        { textKey: 'btn.menu', callbackData: 'f:menu' },
      ],
    ],
  };
}

function balancesKeyboard(): KeyboardSpec {
  return {
    rows: [
      [
        { textKey: 'btn.refresh', callbackData: 'f:balances:r' },
        { textKey: 'btn.accounts', callbackData: 'f:accounts' },
      ],
      [
        { textKey: 'btn.status', callbackData: 'f:status' },
        { textKey: 'btn.menu', callbackData: 'f:menu' },
      ],
    ],
  };
}

function statusKeyboard(): KeyboardSpec {
  return {
    rows: [
      [
        { textKey: 'btn.refresh', callbackData: 'f:status:r' },
        { textKey: 'btn.menu', callbackData: 'f:menu' },
      ],
    ],
  };
}

function menuOnlyKeyboard(): KeyboardSpec {
  return {
    rows: [[{ textKey: 'btn.menu', callbackData: 'f:menu' }]],
  };
}

function playAckKeyboardSpec(ctx: TemplateContext): KeyboardSpec | undefined {
  if (!ctx.playId || !ctx.treeNodeId) return undefined;
  return {
    rows: [
      [
        {
          textKey: 'btn.placed',
          callbackData: `play:${ctx.playId}:${ctx.treeNodeId}:placed`,
        },
        {
          textKey: 'btn.skip',
          callbackData: `play:${ctx.playId}:${ctx.treeNodeId}:skip`,
        },
      ],
    ],
  };
}

function softLines(ctx: TemplateContext): string[] {
  const soft = ctx.soft ?? { partner: 0, expert: 0, house: 0 };
  return [
    `Soft Partner: ${formatMoney(soft.partner)}`,
    `Soft Expert:  ${formatMoney(soft.expert)}`,
    `Soft House:   ${formatMoney(soft.house)}`,
    `Principal out: ${formatMoney(ctx.principalOut ?? 0)}`,
    `Hard: ${formatMoney(ctx.hard ?? 0)} · Pending: ${ctx.pending ?? 0}`,
  ];
}

function phoneLine(ctx: TemplateContext): string | null {
  if (!ctx.phoneLabel && !ctx.sportsbook) return null;
  const book = [ctx.sportsbook, ctx.jurisdiction ? `(${ctx.jurisdiction})` : null]
    .filter(Boolean)
    .join(' ');
  const phone = ctx.phoneLabel ? escapeHtml(ctx.phoneLabel) : '—';
  return book ? `Phone: ${phone} · ${escapeHtml(book)}` : `Phone: ${phone}`;
}

export function renderTemplate(templateId: TemplateId, ctx: TemplateContext): RenderedMessage {
  const callSign = ctx.callSign ? code(ctx.callSign) : code('—');
  const display = ctx.displayName ? escapeHtml(ctx.displayName) : 'Partner';
  const parent = escapeHtml(ctx.parentName ?? '—');
  const expert = escapeHtml(ctx.expertName ?? '—');

  switch (templateId) {
    case 'partner.welcome.v1': {
      const lines = [
        `<b>Welcome · ${display}</b>`,
        `Seat: ${callSign}`,
        `Parent: ${parent}`,
        `Expert: ${expert}`,
      ];
      const phone = phoneLine(ctx);
      if (phone) lines.push(phone);
      lines.push(
        '',
        `You are bound to the ${code(ctx.partnerTemplate ?? 'default-prospect')} package.`,
        'Next: confirm rail → Funding → Warm-up (2 cycles).',
        '',
        '<i>Ball is in your court when Ops sends the next task.</i>'
      );
      return {
        templateId,
        text: lines.join('\n'),
        parseMode: 'HTML',
        keyboard: welcomeKeyboard(),
      };
    }

    case 'balances.v1':
      return {
        templateId,
        text: [bold(`Balances · ${ctx.callSign ?? '—'}`), ...softLines(ctx), '', '<i>Read-only · no Soft post from bot</i>'].join(
          '\n'
        ),
        parseMode: 'HTML',
        keyboard: balancesKeyboard(),
      };

    case 'status.v1':
      return {
        templateId,
        text: [
          bold(`Status · ${ctx.callSign ?? display}`),
          `Accounts: ${ctx.accountsCount ?? 0}`,
          `Placed: ${ctx.placedCount ?? 0}`,
          `P&amp;L: ${formatMoney(ctx.pnl ?? 0)}`,
          '',
          '<i>Read-only · Soft/capital stay on the leaf call-sign</i>',
        ].join('\n'),
        parseMode: 'HTML',
        keyboard: statusKeyboard(),
      };

    case 'accounts.v1':
      return {
        templateId,
        text: [
          bold(`Accounts · ${ctx.callSign ?? display}`),
          `Active books: ${ctx.accountsCount ?? 0}`,
          `Hard (seat): ${formatMoney(ctx.hard ?? 0)}`,
        ].join('\n'),
        parseMode: 'HTML',
        keyboard: statusKeyboard(),
      };

    case 'plays.v1':
      return {
        templateId,
        text: [
          bold(`Plays · ${ctx.callSign ?? display}`),
          `Pending: ${ctx.pending ?? 0}`,
          `Placed: ${ctx.placedCount ?? 0}`,
        ].join('\n'),
        parseMode: 'HTML',
        keyboard: statusKeyboard(),
      };

    case 'tree.v1':
      return {
        templateId,
        text: [
          bold(`Tree · ${ctx.callSign ?? display}`),
          ctx.treeHint ? escapeHtml(ctx.treeHint) : 'Downstream network under your parent.',
          `Parent: ${parent}`,
        ].join('\n'),
        parseMode: 'HTML',
        keyboard: welcomeKeyboard(),
      };

    case 'play.ack.v1':
      return {
        templateId,
        text: [
          bold(`Play · ${ctx.callSign ?? display}`),
          ctx.playId ? `Task/play: ${code(ctx.playId)}` : 'Play ready.',
          '<i>Ack only — no Soft or capital mutation from buttons.</i>',
        ].join('\n'),
        parseMode: 'HTML',
        keyboard: playAckKeyboardSpec(ctx),
      };

    case 'onboard.complete.v1': {
      const lines = [
        bold(`Onboard complete · ${ctx.callSign ?? display}`),
        `Template: ${code(ctx.partnerTemplate ?? 'default-prospect')}`,
        `Expert: ${expert} · Parent: ${parent}`,
      ];
      const phone = phoneLine(ctx);
      if (phone) lines.push(phone);
      lines.push('', 'Welcome is queued. TOC capital path starts only after Ready + rail proof.');
      return {
        templateId,
        text: lines.join('\n'),
        parseMode: 'HTML',
        keyboard: welcomeKeyboard(),
      };
    }

    case 'limit.stale.v1':
      return {
        templateId,
        text: [
          bold(`Limit stale · ${ctx.callSign ?? display}`),
          'Refresh LIMIT before PLAY. Soft stays on the leaf.',
          ctx.gateReason ? `Reason: ${escapeHtml(ctx.gateReason)}` : '',
        ]
          .filter(Boolean)
          .join('\n'),
        parseMode: 'HTML',
        keyboard: menuOnlyKeyboard(),
      };

    case 'gate.blocked.v1':
      return {
        templateId,
        text: [
          bold(`Gate blocked · ${ctx.callSign ?? display}`),
          ctx.gateReason ? escapeHtml(ctx.gateReason) : 'Policy denied this action.',
          '',
          '<i>Read-only bot — Ops owns Soft / tasks / capital.</i>',
        ].join('\n'),
        parseMode: 'HTML',
        keyboard: menuOnlyKeyboard(),
      };

    default: {
      const _exhaustive: never = templateId;
      return {
        templateId: _exhaustive,
        text: bold('Unknown template'),
        parseMode: 'HTML',
      };
    }
  }
}

export const DEFAULT_MESSAGE_TEMPLATES = {
  locale: 'en' as const,
  welcomeTemplate: 'partner.welcome.v1' as TemplateId,
  balancesTemplate: 'balances.v1' as TemplateId,
  statusTemplate: 'status.v1' as TemplateId,
};
