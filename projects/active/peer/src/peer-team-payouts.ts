export type PeerPaymentPlatform = "venmo" | "cashapp" | "paypal";

export type TeamPayoutInput = {
  memberId: string;
  displayName: string;
  venmo?: string | null;
  cashapp?: string | null;
  paypal?: string | null;
};

export type PeerDepositData =
  | { venmoUsername: string }
  | { cashtag: string }
  | { paypalEmail: string };

export type SdkPayeeData = {
  offchainId: string;
  telegramUsername?: string | null;
  metadata?: Record<string, string> | null;
};

export type MemberPaymentMethod = {
  platform: PeerPaymentPlatform;
  processorName: PeerPaymentPlatform;
  depositData: PeerDepositData;
  redactedValue: string;
};

export type NormalizedTeamMember = {
  memberId: string;
  displayName: string;
  methods: MemberPaymentMethod[];
};

export type BuildPeerTeamPayoutsResult = {
  members: NormalizedTeamMember[];
};

const SUPPORTED_PLATFORMS: readonly PeerPaymentPlatform[] = [
  "venmo",
  "cashapp",
  "paypal",
];

export function hasAnySupportedPayoutMethod(
  input: Pick<TeamPayoutInput, "venmo" | "cashapp" | "paypal">,
): boolean {
  return Boolean(input.venmo || input.cashapp || input.paypal);
}

function requireNonEmpty(value: string, fieldName: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    throw new Error(`${fieldName} cannot be empty.`);
  }

  return trimmed;
}

function assertNoWhitespace(value: string, fieldName: string): void {
  if (/\s/.test(value)) {
    throw new Error(`${fieldName} cannot contain spaces.`);
  }
}

function normalizeVenmoUsername(value: string): string {
  const cleaned = requireNonEmpty(value, "Venmo username").replace(/^@+/, "");
  assertNoWhitespace(cleaned, "Venmo username");

  if (!/^[A-Za-z0-9_-]{1,30}$/.test(cleaned)) {
    throw new Error(
      "Venmo username must contain only letters, numbers, underscores, or hyphens.",
    );
  }

  return cleaned;
}

function normalizeCashtag(value: string): string {
  const cleaned = requireNonEmpty(value, "Cash App cashtag").replace(/^\$+/, "");
  assertNoWhitespace(cleaned, "Cash App cashtag");

  if (!/^[A-Za-z0-9_]{1,20}$/.test(cleaned)) {
    throw new Error(
      "Cash App cashtag must contain only letters, numbers, or underscores.",
    );
  }

  return cleaned;
}

function normalizePaypalEmail(value: string): string {
  const cleaned = requireNonEmpty(value, "PayPal email").toLowerCase();

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleaned)) {
    throw new Error("PayPal email must be a valid email address.");
  }

  return cleaned;
}

function redactHandle(value: string): string {
  if (value.length <= 4) {
    return "*".repeat(value.length);
  }

  return `${value.slice(0, 2)}${"*".repeat(value.length - 4)}${value.slice(-2)}`;
}

function buildMemberMethods(input: TeamPayoutInput): MemberPaymentMethod[] {
  const methods: MemberPaymentMethod[] = [];

  if (input.venmo) {
    const venmoUsername = normalizeVenmoUsername(input.venmo);
    methods.push({
      platform: "venmo",
      processorName: "venmo",
      depositData: { venmoUsername },
      redactedValue: redactHandle(venmoUsername),
    });
  }

  if (input.cashapp) {
    const cashtag = normalizeCashtag(input.cashapp);
    methods.push({
      platform: "cashapp",
      processorName: "cashapp",
      depositData: { cashtag },
      redactedValue: redactHandle(cashtag),
    });
  }

  if (input.paypal) {
    const paypalEmail = normalizePaypalEmail(input.paypal);
    methods.push({
      platform: "paypal",
      processorName: "paypal",
      depositData: { paypalEmail },
      redactedValue: redactHandle(paypalEmail),
    });
  }

  if (methods.length === 0) {
    throw new Error(
      `Member "${input.displayName}" must include at least one supported payout method: ${SUPPORTED_PLATFORMS.join(", ")}.`,
    );
  }

  return methods;
}

export function buildPeerTeamPayouts(
  team: readonly TeamPayoutInput[],
): BuildPeerTeamPayoutsResult {
  if (team.length === 0) {
    throw new Error("At least one team member is required.");
  }

  const seenIds = new Set<string>();

  return {
    members: team.map((member) => {
      const memberId = requireNonEmpty(member.memberId, "memberId");
      const displayName = requireNonEmpty(member.displayName, "displayName");

      if (seenIds.has(memberId)) {
        throw new Error(`Duplicate memberId "${memberId}" is not allowed.`);
      }

      seenIds.add(memberId);

      return {
        memberId,
        displayName,
        methods: buildMemberMethods(member),
      };
    }),
  };
}

export function getNormalizedTeamMemberOrThrow(
  result: BuildPeerTeamPayoutsResult,
  memberId: string,
): NormalizedTeamMember {
  const member = result.members.find((entry) => entry.memberId === memberId);
  if (!member) {
    throw new Error(`Selected payout owner "${memberId}" was not found.`);
  }

  return member;
}

export function getPeerCreateDepositPaymentConfig(member: NormalizedTeamMember): {
  processorNames: PeerPaymentPlatform[];
  depositData: PeerDepositData[];
} {
  return {
    processorNames: member.methods.map((method) => method.processorName),
    depositData: member.methods.map((method) => method.depositData),
  };
}

export function getTeamPaymentMethodIndex(
  result: BuildPeerTeamPayoutsResult,
): Record<string, Record<PeerPaymentPlatform, PeerDepositData | undefined>> {
  return Object.fromEntries(
    result.members.map((member) => [
      member.memberId,
      {
        venmo: member.methods.find((method) => method.platform === "venmo")
          ?.depositData,
        cashapp: member.methods.find((method) => method.platform === "cashapp")
          ?.depositData,
        paypal: member.methods.find((method) => method.platform === "paypal")
          ?.depositData,
      },
    ]),
  );
}

export function getSdkPayeeData(member: NormalizedTeamMember): SdkPayeeData[] {
  return member.methods.map((method) => {
    if ("venmoUsername" in method.depositData) {
      return { offchainId: method.depositData.venmoUsername };
    }

    if ("cashtag" in method.depositData) {
      return { offchainId: method.depositData.cashtag };
    }

    return { offchainId: method.depositData.paypalEmail };
  });
}
