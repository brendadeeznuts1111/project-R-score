// agents/domain-strategy.ts
export class UnifiedDomainManager {
  // Single domain for all agents (strategic choice)
  private static PRIMARY_DOMAIN = 'duoplus.android';
  private static BACKUP_DOMAIN = 'ops.secure';
  
  // Subdomain strategy for different departments
  static generateEmail(agentId: string, firstName: string, lastName: string, department: string): string {
    const strategies = [
      // Pattern 1: first.last@dept.duoplus.android
      `${firstName.toLowerCase()}.${lastName.toLowerCase()}@${department}.${this.PRIMARY_DOMAIN}`,
      
      // Pattern 2: agentID@dept.duoplus.android  
      `${agentId.toLowerCase()}@${department}.${this.PRIMARY_DOMAIN}`,
      
      // Pattern 3: f.last@duoplus.android (no dept for senior agents)
      `${firstName[0].toLowerCase()}.${lastName.toLowerCase()}@${this.PRIMARY_DOMAIN}`,
      
      // Pattern 4: first.last.random@duoplus.android
      `${firstName.toLowerCase()}.${lastName.toLowerCase()}.${Math.random().toString(36).substring(2, 5)}@${this.PRIMARY_DOMAIN}` 
    ];
    
    // Choose based on department and agent role
    const strategy = department === 'management' ? 2 : 
                    department === 'operations' ? 0 :
                    Math.floor(Math.random() * strategies.length);
    
    return strategies[strategy];
  }
  
  // Generate social media usernames consistent with email
  static generateSocialUsername(email: string, platform: string): string {
    const usernameBase = email.split('@')[0].replace(/[^a-z0-9]/g, '');
    
    const platformSpecific = {
      'twitter': `@${usernameBase}`,
      'instagram': usernameBase,
      'linkedin': `${usernameBase}_${platform.substring(0, 3)}`,
      'github': `agent-${usernameBase}`,
      'facebook': usernameBase
    };
    
    return platformSpecific[platform as keyof typeof platformSpecific] || usernameBase;
  }
  
  // Is it bad if all are new? Let's simulate account age
  static generateAccountAge(agentTier: 'new' | 'established' | 'senior'): {
    created: string;
    lastLogin: string;
    daysOld: number;
    activityScore: number; // 1-100
  } {
    let daysOld: number;
    let activityScore: number;
    
    switch (agentTier) {
      case 'new':
        daysOld = Math.floor(Math.random() * 30) + 1; // 1-30 days
        activityScore = Math.floor(Math.random() * 30) + 20; // 20-50
        break;
      case 'established':
        daysOld = Math.floor(Math.random() * 300) + 100; // 100-400 days
        activityScore = Math.floor(Math.random() * 40) + 40; // 40-80
        break;
      case 'senior':
        daysOld = Math.floor(Math.random() * 500) + 500; // 500-1000 days
        activityScore = Math.floor(Math.random() * 30) + 70; // 70-100
        break;
    }
    
    const created = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000);
    const lastLogin = new Date(Date.now() - Math.random() * 2 * 24 * 60 * 60 * 1000); // Within 2 days
    
    return {
      created: created.toISOString(),
      lastLogin: lastLogin.toISOString(),
      daysOld,
      activityScore
    };
  }
  
  // DNS records for the domain
  static generateDNSRecords(domain: string = this.PRIMARY_DOMAIN): Array<{
    type: string;
    name: string;
    value: string;
    ttl: number;
  }> {
    return [
      { type: 'A', name: `@`, value: '192.168.1.100', ttl: 3600 },
      { type: 'MX', name: `@`, value: `mail.${domain}`, ttl: 3600 },
      { type: 'TXT', name: `@`, value: 'v=spf1 include:_spf.google.com ~all', ttl: 3600 },
      { type: 'TXT', name: `_dmarc`, value: 'v=DMARC1; p=none; rua=mailto:dmarc@${domain}', ttl: 3600 },
      { type: 'CNAME', name: `mail`, value: `mailserver.${domain}`, ttl: 3600 },
      { type: 'CNAME', name: `web`, value: `webserver.${domain}`, ttl: 3600 },
      { type: 'SRV', name: `_autodiscover._tcp`, value: '0 0 443 autodiscover.${domain}', ttl: 3600 }
    ];
  }
  
  // Email server configuration for the domain
  static generateEmailServerConfig(): string {
    return `# Postfix Configuration for ${this.PRIMARY_DOMAIN}
myhostname = mail.${this.PRIMARY_DOMAIN}
mydomain = ${this.PRIMARY_DOMAIN}
myorigin = \$mydomain
inet_interfaces = all
mydestination = \$myhostname, localhost.\$mydomain, localhost, \$mydomain
mynetworks = 127.0.0.0/8 [::ffff:127.0.0.0]/104 [::1]/128
home_mailbox = Maildir/
smtpd_tls_cert_file = /etc/ssl/certs/ssl-cert-snakeoil.pem
smtpd_tls_key_file = /etc/ssl/private/ssl-cert-snakeoil.key
smtpd_use_tls = yes
smtpd_tls_session_cache_database = btree:\${data_directory}/smtpd_scache
smtp_tls_session_cache_database = btree:\${data_directory}/smtp_scache

# Agent mailboxes (auto-created)
virtual_alias_maps = hash:/etc/postfix/virtual

# DKIM Signing
smtpd_milters = inet:localhost:8891
non_smtpd_milters = \$smtpd_milters
milter_default_action = accept`;
  }
}
