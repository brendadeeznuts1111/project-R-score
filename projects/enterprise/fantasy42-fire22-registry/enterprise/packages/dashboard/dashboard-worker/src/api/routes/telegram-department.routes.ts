#!/usr/bin/env bun

/**
 * 📱🏢 Telegram Department Routes
 *
 * API endpoints for managing departmental Telegram bot interactions
 */

import { IRequest } from 'itty-router';
import { DepartmentalTelegramBot, CustomerInquiry } from '../../telegram/departmental-telegram-bot';

const departmentalBot = new DepartmentalTelegramBot();

/**
 * Submit customer inquiry to department
 * POST /api/telegram/inquiry
 */
export async function submitCustomerInquiry(request: IRequest): Promise<Response> {
  try {
    const { user, message, priority = 'normal' } = await request.json();

    if (!user || !message) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Missing required fields: user, message',
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    const result = await departmentalBot.routeCustomerInquiry(user, message, priority);

    return new Response(
      JSON.stringify({
        success: true,
        data: result,
        message: 'Inquiry submitted successfully',
      }),
      {
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}

/**
 * Get department statistics
 * GET /api/telegram/departments/stats
 * GET /api/telegram/departments/:department/stats
 */
export async function getDepartmentStats(request: IRequest): Promise<Response> {
  try {
    const department = request.params?.department;
    const stats = departmentalBot.getDepartmentStats(department);

    return new Response(
      JSON.stringify({
        success: true,
        data: stats,
        timestamp: new Date().toISOString(),
      }),
      {
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}

/**
 * Get available departments
 * GET /api/telegram/departments
 */
export async function getDepartments(request: IRequest): Promise<Response> {
  try {
    const departments = departmentalBot.getDepartments();

    return new Response(
      JSON.stringify({
        success: true,
        data: departments,
        total: departments.length,
      }),
      {
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}

/**
 * Get pending inquiries for department
 * GET /api/telegram/departments/:department/pending
 */
export async function getPendingInquiries(request: IRequest): Promise<Response> {
  try {
    const { department } = request.params;

    if (!department) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Department parameter required',
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    const inquiries = departmentalBot.getPendingInquiries(department);

    return new Response(
      JSON.stringify({
        success: true,
        data: inquiries,
        total: inquiries.length,
        department,
      }),
      {
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}

/**
 * Get inquiry by ID
 * GET /api/telegram/inquiry/:inquiryId
 */
export async function getInquiry(request: IRequest): Promise<Response> {
  try {
    const { inquiryId } = request.params;

    if (!inquiryId) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Inquiry ID parameter required',
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    const inquiry = departmentalBot.getInquiry(inquiryId);

    if (!inquiry) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Inquiry not found',
        }),
        {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: inquiry,
      }),
      {
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}

/**
 * Escalate inquiry
 * POST /api/telegram/inquiry/:inquiryId/escalate
 */
export async function escalateInquiry(request: IRequest): Promise<Response> {
  try {
    const { inquiryId } = request.params;
    const { reason } = await request.json();

    if (!inquiryId || !reason) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Missing required fields: inquiryId, reason',
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    await departmentalBot.escalateInquiry(inquiryId, reason);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Inquiry escalated successfully',
        inquiryId,
        escalatedAt: new Date().toISOString(),
      }),
      {
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}

/**
 * Resolve inquiry
 * POST /api/telegram/inquiry/:inquiryId/resolve
 */
export async function resolveInquiry(request: IRequest): Promise<Response> {
  try {
    const { inquiryId } = request.params;
    const { agentId, resolutionNotes } = await request.json();

    if (!inquiryId || !agentId) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Missing required fields: inquiryId, agentId',
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    await departmentalBot.resolveInquiry(inquiryId, agentId, resolutionNotes);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Inquiry resolved successfully',
        inquiryId,
        resolvedAt: new Date().toISOString(),
        resolvedBy: agentId,
      }),
      {
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}

/**
 * Get performance report
 * GET /api/telegram/reports/performance
 */
export async function getPerformanceReport(request: IRequest): Promise<Response> {
  try {
    const report = departmentalBot.generatePerformanceReport();

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          report,
          generatedAt: new Date().toISOString(),
        },
      }),
      {
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}

/**
 * Test customer inquiry (for development/testing)
 * POST /api/telegram/test-inquiry
 */
export async function testCustomerInquiry(request: IRequest): Promise<Response> {
  try {
    const testScenarios = [
      {
        user: { id: 12345, username: 'testuser1', first_name: 'John', language_code: 'en' },
        message: 'I need help with my withdrawal, it has been pending for 2 days',
        priority: 'high',
      },
      {
        user: { id: 67890, username: 'testuser2', first_name: 'Maria', language_code: 'es' },
        message: 'Mi aplicación se cierra cuando intento apostar',
        priority: 'urgent',
      },
      {
        user: { id: 11111, username: 'testuser3', first_name: 'João', language_code: 'pt' },
        message: 'Preciso verificar minha conta, que documentos são necessários?',
        priority: 'normal',
      },
    ];

    const results = [];

    for (const scenario of testScenarios) {
      try {
        const result = await departmentalBot.routeCustomerInquiry(
          scenario.user,
          scenario.message,
          scenario.priority
        );
        results.push({
          scenario,
          result,
          success: true,
        });
      } catch (error) {
        results.push({
          scenario,
          error: error.message,
          success: false,
        });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          testResults: results,
          summary: {
            total: testScenarios.length,
            successful: results.filter(r => r.success).length,
            failed: results.filter(r => !r.success).length,
          },
        },
        message: 'Test scenarios completed',
      }),
      {
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}
