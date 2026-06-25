/**
 * Authentication Middleware
 * 
 * Handles login with anomaly detection
 * Integrates with challenge-based authentication
 */

import { sessionManager } from '../compliance/sessionManager';
import { challengeAuthService } from '../services/challengeAuthService';
import { securityMonitor } from '../services/securityMonitor';

export function extractDeviceFeatures(req: any) {
  return {
    root_detected: req.body?.deviceInfo?.rootDetected ? 1 : 0,
    vpn_active: req.body?.deviceInfo?.vpnActive ? 1 : 0,
    thermal_spike: req.body?.deviceInfo?.thermalDelta || 0,
    biometric_fail: req.body?.deviceInfo?.biometricFailCount || 0,
    proxy_hop_count: (req.headers['x-forwarded-for'] || '').split(',').length - 1,
    location_change: req.body?.deviceInfo?.locationDelta || 0,
    time_anomaly: calculateTimeAnomaly(req.body?.timestamp),
    device_fingerprint_mismatch: req.body?.deviceInfo?.fingerprintMismatch ? 1 : 0,
    unusual_transaction_pattern: 0,
    rapid_api_calls: 0,
  };
}

export function calculateTimeAnomaly(timestamp?: number): number {
  if (!timestamp) return 0;
  const timeDiff = Math.abs(Date.now() - timestamp);
  const maxDiff = 60000;
  return Math.min(timeDiff / maxDiff, 1);
}

export function getClientIP(req: any): string {
  return (
    req.headers['x-forwarded-for']?.split(',')[0] ||
    req.headers['x-real-ip'] ||
    req.socket?.remoteAddress ||
    'unknown'
  );
}

export async function handleLogin(req: any, res: any) {
  try {
    const { username, password, deviceFingerprint } = req.body;

    if (!username || !password) {
      return res.json({
        success: false,
        message: 'Username and password required',
      });
    }

    const features = extractDeviceFeatures(req);
    const clientIP = getClientIP(req);

    const session = await sessionManager.createSession(
      username,
      deviceFingerprint,
      features,
      clientIP
    );

    if (session.requiresChallenge) {
      const challenge = challengeAuthService.createChallenge(
        session.id,
        username,
        'email'
      );

      securityMonitor.logEvent({
        type: 'challenge_required',
        userId: username,
        sessionId: session.id,
        ipAddress: clientIP,
        riskScore: session.riskScore,
        riskLevel: session.riskLevel,
        reason: 'Medium-risk session detected',
        factors: session.riskFactors,
      });

      return res.json({
        success: true,
        requiresChallenge: true,
        challengeId: challenge.id,
        sessionId: session.id,
        challengeType: 'email',
        message: 'Challenge required for this session',
        riskScore: session.riskScore,
      });
    }

    if (session.blocked) {
      securityMonitor.logEvent({
        type: 'session_blocked',
        userId: username,
        sessionId: session.id,
        ipAddress: clientIP,
        riskScore: session.riskScore,
        riskLevel: session.riskLevel,
        reason: 'High-risk anomaly detected',
        factors: session.riskFactors,
      });

      securityMonitor.trackSession(session.id, true, session.riskScore);

      return res.json({
        success: false,
        message: 'Login blocked due to security concerns',
        riskScore: session.riskScore,
      });
    }

    securityMonitor.logEvent({
      type: 'session_created',
      userId: username,
      sessionId: session.id,
      ipAddress: clientIP,
      riskScore: session.riskScore,
      riskLevel: session.riskLevel,
      factors: session.riskFactors,
    });

    securityMonitor.trackSession(session.id, false, session.riskScore);

    return res.json({
      success: true,
      sessionId: session.id,
      riskScore: session.riskScore,
      message: 'Login successful',
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.json({
      success: false,
      message: 'Login failed',
    });
  }
}

export async function validateSessionMiddleware(req: any, res: any, next: any) {
  try {
    const sessionId = req.headers['x-session-id'];
    if (!sessionId) {
      return next();
    }

    const session = await sessionManager.validateSession(sessionId as string);
    if (!session.valid) {
      return res.status(401).json({
        success: false,
        message: 'Session invalid or expired',
      });
    }

    req.session = session;
    next();
  } catch (error) {
    console.error('Session validation error:', error);
    next();
  }
}

