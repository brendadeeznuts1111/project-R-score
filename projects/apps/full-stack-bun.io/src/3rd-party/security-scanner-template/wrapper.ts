export async function securityScan(code: string, entry: string): Promise<{ vulnerabilities: any[] }> {
  // Simple mock security scanner
  const vulnerabilities = [];

  // Check for common security issues
  if (code.includes('eval(')) {
    vulnerabilities.push({ severity: 'high', title: 'Use of eval() detected' });
  }
  if (code.includes('innerHTML')) {
    vulnerabilities.push({ severity: 'medium', title: 'Potential XSS via innerHTML' });
  }
  if (code.includes('document.cookie')) {
    vulnerabilities.push({ severity: 'medium', title: 'Direct cookie access' });
  }

  return { vulnerabilities };
}
