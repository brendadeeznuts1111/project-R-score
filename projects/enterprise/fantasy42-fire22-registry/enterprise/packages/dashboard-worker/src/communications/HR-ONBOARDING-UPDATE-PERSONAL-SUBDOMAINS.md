# 🚀 UPDATED HR ONBOARDING PROCESS: Personal Subdomains

**Document Type**: Process Update  
**Effective Date**: August 28, 2025  
**Updated By**: Jennifer Adams - HR Director  
**Process ID**: HR-ONBOARD-2025-002

---

## 🔄 MANDATORY PROCESS UPDATE

**ALL new employee onboarding MUST now include personal Fire22 Workers subdomain
provisioning.**

---

## 📋 UPDATED ONBOARDING CHECKLIST

### **Day 1 - Employee Arrival**

- [ ] Complete standard HR paperwork
- [ ] **🆕 SUBDOMAIN REQUEST**: Submit personal subdomain request
  - Employee chooses preferred identifier (firstname-lastname or approved
    nickname)
  - HR validates availability and compliance
  - Technology Department receives provisioning request
- [ ] Issue equipment and access credentials
- [ ] Department head introduction and orientation

### **Day 2 - Technical Setup**

- [ ] IT equipment configuration and software installation
- [ ] **🆕 SUBDOMAIN PROVISIONING**: Technology Department provisions personal
      subdomain
  - SSL certificate automatic setup via Cloudflare Workers
  - Basic personal profile page template deployment
  - Integration with Fire22 authentication systems
- [ ] System access validation and security briefing
- [ ] Department-specific tool training

### **Day 3 - Profile & Integration**

- [ ] **🆕 PERSONAL SITE SETUP**: Employee completes personal profile
  - Professional headshot upload
  - Contact information and bio completion
  - Department integration and role-specific tools
  - Quick actions and workflow customization
- [ ] Team directory integration update
- [ ] Department-specific onboarding continuation

### **Week 1 - Validation & Go-Live**

- [ ] **🆕 SUBDOMAIN QA REVIEW**: HR and IT validate site compliance
  - Fire22 branding standards compliance
  - Professional content and image standards
  - Security and access control validation
  - Mobile responsiveness and functionality testing
- [ ] **🆕 GO-LIVE NOTIFICATION**: Subdomain activation and team announcement
- [ ] Complete role-specific training and certification

---

## 👤 EMPLOYEE PERSONAL SUBDOMAIN REQUIREMENTS

### **Mandatory Information**

- **Full Name & Title**: As listed in HR records
- **Department & Role**: Current position and reporting structure
- **Contact Information**: Email, phone, Slack, and Telegram handles
- **Professional Bio**: 2-3 sentences about background and expertise
- **Professional Headshot**: High-quality, professional photograph

### **Role-Specific Customization**

- **Quick Actions**: Department-specific tools and workflows
- **Team Integration**: Links to department pages and team resources
- **Scheduling System**: Calendar integration for meetings and collaboration
- **Project Showcase**: Current work and responsibilities (when appropriate)

---

## 🔧 TECHNICAL SPECIFICATIONS

### **Subdomain Naming Convention**

```text
Pattern: [identifier].fire22.workers.dev
Examples:
- john-smith.fire22.workers.dev (standard)
- vinny2times.fire22.workers.dev (approved nickname)
- sarah-martinez.fire22.workers.dev (hyphenated names)
```

### **Required Features**

- **SSL/TLS Encryption**: Automatic via Cloudflare
- **Mobile Responsive**: Works on all devices
- **Fire22 Branding**: Consistent visual identity
- **Search Optimization**: Basic SEO for internal discovery
- **Analytics Integration**: Personal site usage metrics

### **Enhanced Features (Leadership)**

- **Team Dashboard**: Direct reports and management tools
- **Advanced Analytics**: Department-specific metrics
- **Administrative Tools**: Role-based management functions
- **Custom Workflows**: Leadership-specific quick actions

---

## 📞 UPDATED CONTACT RESPONSIBILITIES

### **HR Department (Jennifer Adams, Marcus Rivera)**

- **Process all subdomain requests** within 2 business days
- **Validate naming convention compliance** and availability
- **Conduct QA review** for professional standards
- **Maintain employee subdomain registry** with current information
- **Provide onboarding support** and answer policy questions

### **Technology Department (Chris Brown, Amanda Garcia, Danny Kim, Sophia Zhang)**

- **Provision subdomains** via Cloudflare Workers automation
- **Deploy personal site templates** with Fire22 branding
- **Configure SSL certificates** and security settings
- **Integrate with authentication systems** and directory services
- **Provide technical support** for site customization and issues

### **Department Heads (All)**

- **Review and approve** team member subdomain requests
- **Validate professional content** and department integration
- **Update team directories** with personal subdomain URLs
- **Monitor ongoing compliance** with Fire22 standards
- **Support employee customization** and role-specific features

---

## 🎯 INTEGRATION WITH EXISTING SYSTEMS

### **Team Directory Updates**

All employee entries in `src/communications/team-directory.json` MUST include:

```json
{
  "id": "employee-identifier",
  "name": "Employee Name",
  "personalSite": "https://employee-identifier.fire22.workers.dev/",
  "quickActions": [..., "personal-site"]
}
```

### **Blog & Communications Integration**

- **Blog Authors**: Personal subdomain URLs in `blog/authors.yml`
- **RSS Feeds**: Include personal site links in announcements
- **Internal Communications**: Reference personal sites in team updates

### **Slack & Telegram Integration**

- **Profile Updates**: Include personal site links in Slack/Telegram profiles
- **Bot Commands**: Add personal site quick access in communication bots
- **Directory Commands**: Team lookup includes personal site access

---

## 📊 COMPLIANCE & QUALITY STANDARDS

### **Content Standards**

- **Professional Appearance**: Business-appropriate images and content
- **Current Information**: Up-to-date contact details and role information
- **Fire22 Branding**: Consistent with company visual identity
- **Accessibility Compliance**: WCAG 2.1 AA standards for inclusive access

### **Security Requirements**

- **HTTPS Only**: No unsecured content or mixed protocols
- **Authentication Integration**: Single sign-on with Fire22 systems
- **Data Privacy**: No customer data or sensitive information
- **Regular Security Reviews**: Monthly vulnerability assessments

### **Performance Standards**

- **Load Time**: < 3 seconds on standard internet connection
- **Mobile Optimization**: Full functionality on mobile devices
- **Uptime**: 99.9% availability via Cloudflare Workers
- **Analytics Tracking**: Usage metrics for optimization

---

## ✅ SUCCESS METRICS & REPORTING

### **Onboarding Efficiency**

- **Target**: 100% of new hires receive personal subdomains within 3 days
- **Quality**: 95% pass QA review on first submission
- **Employee Satisfaction**: 90%+ positive feedback on personal site experience
- **Technical Performance**: Zero security incidents, 99.9% uptime

### **Ongoing Maintenance**

- **Monthly Reviews**: Compliance audits and content updates
- **Quarterly Updates**: Process improvements and feature enhancements
- **Annual Assessment**: Full program evaluation and optimization
- **Continuous Support**: HR and IT support availability

---

## 📋 UPDATED ONBOARDING FORMS

### **New Employee Subdomain Request Form**

```text
FIRE22 PERSONAL SUBDOMAIN REQUEST

Employee Information:
- Full Name: _______________
- Department: _______________
- Reporting Manager: _______________
- Start Date: _______________

Subdomain Preferences:
- Preferred Identifier: _______________
- Alternative Option: _______________

Contact Information:
- Email: _______________
- Phone: _______________
- Slack Username: _______________
- Telegram Handle: _______________

Professional Information:
- Bio (2-3 sentences): _______________
- Professional Headshot: [ ] Attached
- Role-Specific Tools Needed: _______________

Department Head Approval:
- Approved By: _______________
- Date: _______________
- Signature: _______________

HR Processing:
- Request ID: _______________
- Processed By: _______________
- Status: [ ] Approved [ ] Needs Revision
- IT Ticket Number: _______________
```

---

**PROCESS ENFORCEMENT**: This updated onboarding process is mandatory for ALL
new Fire22 employees starting August 28, 2025.

**RETROACTIVE APPLICATION**: All current employees without personal subdomains
must complete this process within 30 days.

---

<function_calls> <invoke name="TodoWrite"> <parameter name="todos">[{"id":
"notify-hr-subdomain-policy", "content": "Create HR directive for employee
personal subdomains policy", "status": "completed"}, {"id":
"create-subdomain-standards", "content": "Establish Fire22 Workers subdomain
standards document", "status": "completed"}, {"id": "update-hr-processes",
"content": "Update HR onboarding processes to include subdomain provisioning",
"status": "completed"}]
