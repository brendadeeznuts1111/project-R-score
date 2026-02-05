import { LightningService } from "../services/lightningService.js";
import { SavingsOptimizer } from "../finance/savingsOptimizer.js";
import { db } from "../database/db.js";

export interface QuestPaymentRequest {
  questId: string;
  userId: string;
  amount: number; // in USD
}

/**
 * Handle quest payment request - generates QR or Lightning invoice
 */
export async function handleQuestPaymentRequest(req: Request): Promise<Response> {
  try {
    const url = new URL(req.url);
    const questId = url.searchParams.get("questId");
    const userId = url.searchParams.get("userId");
    const amount = parseFloat(url.searchParams.get("amount") || "0");

    if (!questId || !userId || !amount || amount <= 0) {
      return new Response(
        JSON.stringify({ error: "Missing or invalid parameters" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Check if user has Lightning wallet
    const userAgent = req.headers.get("user-agent") || "";
    const hasLightningWallet = detectLightningWallet(userAgent);

    if (hasLightningWallet) {
      // Generate Lightning invoice
      const lightningService = LightningService.getInstance();
      const amountSats = Math.round(amount * 100000000); // Convert USD to sats
      
      const invoice = await lightningService.generateQuestInvoice({
        questId,
        userId,
        amountSats,
        description: `Quest Payment: ${questId}`,
      });

      const qrUri = `lightning:${invoice}`;
      const qrSvg = generateQRCodeSVG(qrUri);

      return new Response(qrSvg, {
        headers: {
          "Content-Type": "image/svg+xml",
          "X-Payment-Method": "lightning",
          "X-Invoice": invoice,
          "X-Amount-Sats": amountSats.toString(),
        },
      });
    } else {
      // Fallback to Venmo/Cash App
      return handleFallbackPayment(questId, userId, amount);
    }
  } catch (error) {
    console.error("Payment route error:", error);
    return new Response(
      JSON.stringify({ error: "Payment processing failed", details: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

/**
 * Handle webhook for invoice settlement
 */
export async function handleSettlementWebhook(req: Request): Promise<Response> {
  try {
    const webhookData = await req.json();
    
    // Verify webhook signature (if configured)
    const signature = req.headers.get("X-Webhook-Signature");
    if (process.env.WEBHOOK_SECRET && !verifyWebhookSignature(webhookData, signature)) {
      return new Response("Invalid signature", { status: 401 });
    }

    const lightningService = LightningService.getInstance();
    await lightningService.handleInvoiceSettlement(webhookData);

    return new Response(JSON.stringify({ status: "processed" }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Webhook error:", error);
    return new Response(JSON.stringify({ error: "Webhook processing failed" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

/**
 * Get payment status for a quest
 */
export async function getPaymentStatus(req: Request): Promise<Response> {
  try {
    const url = new URL(req.url);
    const questId = url.searchParams.get("questId");

    if (!questId) {
      return new Response(
        JSON.stringify({ error: "Missing questId" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Query database for quest status
    const result = await db.query(
      "SELECT status, settled_sats, payment_hash, completed_at FROM quests WHERE id = ?",
      [questId]
    );

    if (result.rows.length === 0) {
      return new Response(
        JSON.stringify({ error: "Quest not found" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    const quest = result.rows[0];
    return new Response(JSON.stringify(quest), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Status check error:", error);
    return new Response(JSON.stringify({ error: "Status check failed" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

/**
 * Get user's savings allocation
 */
export async function getSavingsAllocation(req: Request): Promise<Response> {
  try {
    const url = new URL(req.url);
    const userId = url.searchParams.get("userId");

    if (!userId) {
      return new Response(
        JSON.stringify({ error: "Missing userId" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const optimizer = new SavingsOptimizer();
    const allocation = await optimizer.getSavingsAllocation(userId);

    return new Response(JSON.stringify(allocation), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Savings allocation error:", error);
    return new Response(JSON.stringify({ error: "Failed to get allocation" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

/**
 * Detect if user agent has Lightning wallet
 */
function detectLightningWallet(userAgent: string): boolean {
  const walletApps = [
    "Zap", "Blixt", "Nayuta", "Mutiny", "Zeus", "Phoenix",
    "Breez", "Strike", "Wallet of Satoshi", "BlueWallet"
  ];
  
  return walletApps.some(app => userAgent.toLowerCase().includes(app.toLowerCase()));
}

/**
 * Generate QR code SVG for Lightning invoice
 */
function generateQRCodeSVG(uri: string): string {
  // Simple QR code generator (in production, use a proper library)
  // For now, return a placeholder SVG with the URI
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="300" height="300" xmlns="http://www.w3.org/2000/svg">
  <rect width="300" height="300" fill="#FF6B35"/>
  <text x="150" y="150" font-family="monospace" font-size="12" fill="white" text-anchor="middle" dominant-baseline="middle">
    ${uri.substring(0, 20)}...
  </text>
  <text x="150" y="170" font-family="monospace" font-size="10" fill="white" text-anchor="middle">
    Scan with Lightning Wallet
  </text>
</svg>`;
}

/**
 * Handle fallback payment (Venmo/Cash App)
 */
async function handleFallbackPayment(questId: string, userId: string, amount: number): Promise<Response> {
  // Generate deep links for Venmo and Cash App
  const venmoLink = `venmo://pay?recipient=${userId}&amount=${amount}&note=Quest:${questId}`;
  const cashAppLink = `cash.app/$${userId}/${amount}`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <title>Quest Payment - DuoPlus</title>
  <style>
    body { font-family: Arial, sans-serif; background: #1a1a1a; color: white; padding: 20px; }
    .container { max-width: 400px; margin: 0 auto; text-align: center; }
    .btn { display: block; width: 100%; padding: 15px; margin: 10px 0; background: #FF6B35; color: white; text-decoration: none; border-radius: 8px; font-weight: bold; }
    .amount { font-size: 24px; color: #FF6B35; margin: 20px 0; }
    .quest { font-size: 14px; color: #888; }
  </style>
</head>
<body>
  <div class="container">
    <h2>⚡ Quest Payment</h2>
    <div class="quest">Quest: ${questId}</div>
    <div class="amount">$${amount.toFixed(2)}</div>
    <a href="${venmoLink}" class="btn">Pay with Venmo</a>
    <a href="${cashAppLink}" class="btn">Pay with Cash App</a>
    <p style="font-size: 12px; color: #666; margin-top: 20px;">
      Or use a Lightning wallet for instant payment
    </p>
  </div>
</body>
</html>`;

  return new Response(html, {
    headers: { "Content-Type": "text/html" },
  });
}

/**
 * Verify webhook signature
 */
function verifyWebhookSignature(data: any, signature: string | null): boolean {
  if (!signature || !process.env.WEBHOOK_SECRET) return false;
  
  // In production, implement proper HMAC verification
  // For now, mock implementation
  return true;
}

/**
 * Generate Lightning invoice for specific amount
 */
export async function generateInvoiceForQuest(req: Request): Promise<Response> {
  try {
    const body = await req.json();
    const { questId, userId, amountSats, description } = body;

    if (!questId || !userId || !amountSats) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const lightningService = LightningService.getInstance();
    const invoice = await lightningService.generateQuestInvoice({
      questId,
      userId,
      amountSats,
      description: description || `Quest: ${questId}`,
    });

    return new Response(
      JSON.stringify({
        invoice,
        amountSats,
        paymentHash: crypto.createHash("sha256").update(invoice).digest("hex"),
      }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Invoice generation error:", error);
    return new Response(
      JSON.stringify({ error: "Invoice generation failed", details: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

/**
 * Get user's Lightning balance
 */
export async function getUserLightningBalance(req: Request): Promise<Response> {
  try {
    const url = new URL(req.url);
    const userId = url.searchParams.get("userId");

    if (!userId) {
      return new Response(
        JSON.stringify({ error: "Missing userId" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const result = await db.query(
      "SELECT balance_sats FROM lightning_wallets WHERE user_id = ?",
      [userId]
    );

    const balance = result.rows[0]?.balance_sats || 0;
    const btcPrice = parseFloat(process.env.BTC_PRICE || "45000");
    const usdValue = (balance / 100000000) * btcPrice;

    return new Response(
      JSON.stringify({
        balanceSats: balance,
        balanceUsd: usdValue,
        btcPrice,
      }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Balance check error:", error);
    return new Response(
      JSON.stringify({ error: "Balance check failed" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}