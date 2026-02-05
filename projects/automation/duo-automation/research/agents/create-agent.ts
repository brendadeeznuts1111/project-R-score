// agents/create-agent.ts
import { PaymentPlatformManager } from './payment-platforms.js';
import { PhoneProvisioningManager } from './phone-provisioning.js';
import { UnifiedDomainManager } from './domain-strategy.js';
import { AgentTipsManager } from './tips-system.js';

export async function createCompleteAgent(args: string[]): Promise<any> {
  const agentId = `AG${String(Math.floor(1000 + Math.random() * 9000)).padStart(6, '0')}`;
  const firstName = args.find(arg => arg.startsWith('--first='))?.split('=')[1] || 'Agent';
  const lastName = args.find(arg => arg.startsWith('--last='))?.split('=')[1] || String(Math.floor(1000 + Math.random() * 9000));
  const department = args.find(arg => arg.startsWith('--dept='))?.split('=')[1] || 'operations';
  const phoneType = args.find(arg => arg.startsWith('--phone-type='))?.split('=')[1] || 'virtual';
  
  console.log(`🚀 Creating complete agent: ${agentId}`);
  console.log(`Name: ${firstName} ${lastName} | Department: ${department}`);
  
  // 1. Generate email with unified domain
  const email = UnifiedDomainManager.generateEmail(agentId, firstName, lastName, department);
  console.log(`📧 Email: ${email}`);
  
  // 2. Generate phone
  const phone = PhoneProvisioningManager.generatePhone(agentId, phoneType as any);
  console.log(`📱 Phone: ${phone.number} (${phone.carrier})`);
  
  // 3. Generate payment profiles
  const payments = PaymentPlatformManager.generateCompletePaymentProfile(email, phone.number, agentId);
  console.log(`💰 Payments: Venmo: ${payments.venmo ? '✅' : '❌'} | CashApp: ${payments.cashapp ? '✅' : '❌'} | PayPal: ✅`);
  
  // 4. Generate tips
  const tips = AgentTipsManager.generateTipsForAgent(department, true);
  console.log(`💡 Tips: ${tips.length} recommendations generated`);
  
  // 5. Assess risk
  const riskAssessment = AgentTipsManager.assessNewAgentRisk({
    allAccountsNew: true,
    sameDevice: false,
    noTransactionHistory: true,
    identicalPatterns: false
  });
  
  // 6. Generate setup script
  const setupScript = PhoneProvisioningManager.generatePhoneSetupScript(phone, email);
  
  // Output
  const output = {
    agent: {
      id: agentId,
      name: `${firstName} ${lastName}`,
      department,
      email,
      phone,
      payments,
      accountAge: UnifiedDomainManager.generateAccountAge('new'),
      tips,
      riskAssessment,
      created: new Date().toISOString()
    },
    setup: {
      script: setupScript,
      checklist: AgentTipsManager.generateSetupChecklist(agentId),
      dnsRecords: UnifiedDomainManager.generateDNSRecords(),
      emailConfig: UnifiedDomainManager.generateEmailServerConfig()
    }
  };
  
  // Save to file
  const outputDir = 'agents/outputs';
  await Bun.mkdir(outputDir, { recursive: true });
  const filename = `${outputDir}/agent_${agentId}_${Date.now()}.json`;
  await Bun.write(filename, JSON.stringify(output, null, 2));
  
  console.log(`\n✅ Agent ${agentId} created successfully!`);
  console.log(`📁 Saved to: ${filename}`);
  console.log(`\n🔑 Credentials:`);
  console.log(`   Email: ${email}`);
  console.log(`   Phone: ${phone.number}`);
  console.log(`   Venmo: ${payments.venmo?.handle || 'N/A'}`);
  console.log(`   CashApp: ${payments.cashapp?.cashtag || 'N/A'}`);
  console.log(`\n⚠️  Risk Level: ${riskAssessment.riskLevel.toUpperCase()}`);
  console.log(`💡 First tip: ${tips[0].tip}`);
  
  return output;
}

// CLI command handler
export async function handleAgentCommand(args: string[]): Promise<void> {
  const command = args[0];
  
  switch (command) {
    case 'create-agent':
      await createCompleteAgent(args.slice(1));
      break;
    
    case 'batch-create':
      const count = parseInt(args.find(arg => arg.startsWith('--count='))?.split('=')[1] || '5');
      const dept = args.find(arg => arg.startsWith('--dept='))?.split('=')[1] || 'operations';
      
      console.log(`🚀 Creating ${count} agents for ${dept} department...`);
      
      for (let i = 0; i < count; i++) {
        await createCompleteAgent([
          `--first=Agent${i}`,
          `--last=Ops${i}`,
          `--dept=${dept}`,
          '--phone-type=virtual'
        ]);
      }
      break;
    
    case 'assess-risk':
      // Risk assessment for existing agents
      const agentFiles = await Bun.Glob('agents/outputs/agent_*.json').toArray();
      console.log('📊 Risk Assessment Summary:');
      console.log(`Found ${agentFiles.length} agent files`);
      // Implementation would parse existing agent files
      break;
    
    default:
      console.log(`
🤖 Agent Management Commands:

create-agent --first=<name> --last=<name> --dept=<dept> --phone-type=<type>
  Create a single complete agent with payment platforms, phone, and tips

batch-create --count=<number> --dept=<dept>
  Create multiple agents for a department

assess-risk
  Assess risk levels for all created agents

Examples:
  bun agents/create-agent.ts create-agent --first=John --last=Smith --dept=payment-ops --phone-type=virtual
  bun agents/create-agent.ts batch-create --count=10 --dept=phone-intel
      `);
  }
}

// Run if called directly
if (import.meta.main) {
  await handleAgentCommand(process.argv.slice(2));
}
