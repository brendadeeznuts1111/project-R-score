// agents/phone-provisioning.ts
export interface AgentPhone {
  number: string;
  carrier: string;
  imei: string;
  model: string;
  os: string;
  plan: string;
  dataLimit: string;
  smsEnabled: boolean;
  mmsEnabled: boolean;
  voicemailPin: string;
  lastActive: string;
  status: 'active' | 'suspended' | 'pending';
  
  // For virtual numbers
  virtual?: {
    provider: 'Twilio' | 'Google Voice' | 'Burner' | 'TextNow';
    apiKey?: string;
    webhookUrl?: string;
  };
}

export interface PhoneActivity {
  type: 'sms' | 'call' | 'data';
  direction: 'inbound' | 'outbound';
  timestamp: string;
  counterparty: string;
  content?: string;
  duration?: number;
}

export class PhoneProvisioningManager {
  private static carriers = ['Verizon', 'AT&T', 'T-Mobile', 'Google Fi', 'Mint Mobile'];
  private static models = ['iPhone 14', 'iPhone 13', 'Samsung Galaxy S22', 'Google Pixel 7', 'OnePlus 10'];
  
  // Generate physical or virtual phone
  static generatePhone(
    agentId: string, 
    type: 'physical' | 'virtual' = 'virtual',
    countryCode: string = '+1'
  ): AgentPhone {
    const phoneNumber = this.generatePhoneNumber(countryCode);
    const imei = this.generateIMEI();
    const model = this.models[Math.floor(Math.random() * this.models.length)];
    const carrier = this.carriers[Math.floor(Math.random() * this.carriers.length)];
    
    const phone: AgentPhone = {
      number: phoneNumber,
      carrier,
      imei,
      model,
      os: model.includes('iPhone') ? 'iOS 16' : 'Android 13',
      plan: this.generatePlan(carrier),
      dataLimit: `${Math.floor(Math.random() * 20) + 5}GB`,
      smsEnabled: true,
      mmsEnabled: true,
      voicemailPin: String(Math.floor(1000 + Math.random() * 9000)),
      lastActive: new Date().toISOString(),
      status: 'active'
    };
    
    if (type === 'virtual') {
      const providers: Array<'Twilio' | 'Google Voice' | 'Burner' | 'TextNow'> = 
        ['Twilio', 'Google Voice', 'Burner', 'TextNow'];
      const provider = providers[Math.floor(Math.random() * providers.length)];
      
      phone.virtual = {
        provider,
        apiKey: provider === 'Twilio' ? 
          `SK${Math.random().toString(36).substring(2, 15)}` : undefined,
        webhookUrl: `https://webhook.duoplus.android/agent/${agentId}/sms` 
      };
    }
    
    return phone;
  }
  
  private static generatePhoneNumber(countryCode: string = '+1'): string {
    // Generate US-style number: +1 (XXX) XXX-XXXX
    const areaCode = Math.floor(200 + Math.random() * 800); // 200-999
    const prefix = Math.floor(200 + Math.random() * 800);
    const line = Math.floor(1000 + Math.random() * 9000);
    
    return `${countryCode} (${areaCode}) ${prefix}-${line}`;
  }
  
  private static generateIMEI(): string {
    // Generate 15-digit IMEI
    let imei = '';
    for (let i = 0; i < 15; i++) {
      imei += Math.floor(Math.random() * 10);
    }
    return imei;
  }
  
  private static generatePlan(carrier: string): string {
    const plans: { [key: string]: string[] } = {
      'Verizon': ['Unlimited Welcome', 'Unlimited Plus', '5G Get More'],
      'AT&T': ['Unlimited Starter', 'Unlimited Extra', 'Unlimited Premium'],
      'T-Mobile': ['Essentials', 'Magenta', 'Magenta MAX'],
      'Google Fi': ['Flexible', 'Simply Unlimited', 'Unlimited Plus'],
      'Mint Mobile': ['4GB', '10GB', 'Unlimited']
    };
    
    return plans[carrier]?.[Math.floor(Math.random() * plans[carrier].length)] || 'Unlimited';
  }
  
  // Generate realistic SMS activity
  static generateSMSActivity(phoneNumber: string, days: number = 30): PhoneActivity[] {
    const activities: PhoneActivity[] = [];
    const contacts = this.generateContacts();
    
    for (let i = 0; i < days; i++) {
      const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      
      // 5-20 SMS per day
      const smsCount = Math.floor(Math.random() * 15) + 5;
      
      for (let j = 0; j < smsCount; j++) {
        const contact = contacts[Math.floor(Math.random() * contacts.length)];
        const direction: 'inbound' | 'outbound' = Math.random() > 0.5 ? 'inbound' : 'outbound';
        const hour = Math.floor(Math.random() * 24);
        const minute = Math.floor(Math.random() * 60);
        
        date.setHours(hour, minute);
        
        activities.push({
          type: 'sms',
          direction,
          timestamp: date.toISOString(),
          counterparty: contact.number,
          content: this.generateSMSContent()
        });
      }
    }
    
    return activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }
  
  private static generateContacts(): Array<{name: string, number: string}> {
    const names = [
      'Mom', 'Dad', 'Sister', 'Brother', 'Alex', 'Jordan', 'Taylor', 
      'Casey', 'Riley', 'Morgan', 'Work', 'Boss', 'Doctor', 'Bank'
    ];
    
    return names.map(name => ({
      name,
      number: this.generatePhoneNumber()
    }));
  }
  
  private static generateSMSContent(): string {
    const messages = [
      'Hey, are we still on for dinner?',
      'Can you pick up milk on the way home?',
      'Running late, be there in 10',
      'Did you see that email?',
      'Call me when you get this',
      'Thanks for your help earlier',
      'What time is the meeting tomorrow?',
      'Happy birthday!',
      'Check out this link: https://example.com',
      'LOL',
      'OK',
      'Sounds good',
      'On my way',
      'Are you free to talk?',
      'Reminder: appointment at 3pm'
    ];
    
    return messages[Math.floor(Math.random() * messages.length)];
  }
  
  // Generate phone setup script for Android VM
  static generatePhoneSetupScript(phone: AgentPhone, agentEmail: string): string {
    return `#!/bin/bash
# Phone Provisioning Script for ${agentEmail}
# Generated: ${new Date().toISOString()}

echo "📱 Setting up ${phone.model} for agent..."

# Install required apps
echo "Installing messaging apps..."
adb install messaging_apps.apk

# Configure phone settings
echo "Configuring phone settings..."
adb shell settings put global airplane_mode_on 0
adb shell settings put global mobile_data 1
adb shell settings put global wifi_on 1

# Setup SMS forwarding (if virtual)
if [ -n "${phone.virtual?.webhookUrl || ''}" ]; then
  echo "Configuring SMS forwarding to ${phone.virtual?.webhookUrl || ''}"
  adb push sms_forwarding.config /data/local/tmp/
fi

# Setup voicemail
echo "Setting up voicemail..."
adb shell am start -a android.intent.action.CALL -d tel:${phone.number.replace(/\D/g, '')}

# Install payment apps
echo "Installing payment apps..."
for app in venmo cashapp paypal; do
  adb install \${app}.apk
done

# Configure payment apps with agent credentials
echo "Configuring Venmo..."
adb shell input text "${phone.number}"
adb shell input keyevent KEYCODE_ENTER

echo "✅ Phone setup complete for ${phone.number}"
echo "📞 Test by calling: ${phone.number}"
`;
  }
}
