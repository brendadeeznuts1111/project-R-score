/**
 * Request Types for Fire22 API
 */
export interface ValidatedRequest extends Request {
  params?: Record<string, string>;
  query?: Record<string, string>;
  user?: {
    id: string;
    role: string;
    permissions: string[];
  };
}
//# sourceMappingURL=request.d.ts.map
