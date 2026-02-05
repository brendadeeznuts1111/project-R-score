#!/bin/bash
# Phase 01: One-Click Apple Developer Program Enroll
# Auto-click verification link and drive enrollment form

set -e

echo "🍎 Phase 01: Apple Developer Program Enrollment"
echo "=============================================="

# Validate required environment variables
required_vars=("GMAIL_API_KEY" "CAPTCHA_KEY" "APPLE_CARD")
for var in "${required_vars[@]}"; do
  if [ -z "${!var}" ]; then
    echo "❌ Missing required environment variable: $var"
    exit 1
  fi
done

# Create Kiwi browser automation directory
KIWI_DIR="/data/local/tmp/kiwi-automation"
mkdir -p "$KIWI_DIR"
cd "$KIWI_DIR"

# Install required tools
echo "📦 Installing dependencies..."
apt update && apt install -y curl wget jq python3 python3-pip unzip

# Install Kiwi Browser (Chromium-based)
echo "🔍 Setting up Kiwi Browser automation..."
if [ ! -f "kiwi.apk" ]; then
  wget -O kiwi.apk "https://github.com/kiwibrowser/src/releases/download/114.0.5735.35/kiwi-browser-v114.0.5735.35.apk"
fi

# Install 2captcha solver
pip3 install 2captcha-python

# Create email parser script
cat > parse_verification_email.py << 'EOF'
#!/usr/bin/env python3
import os
import sys
import json
import base64
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError

GMAIL_API_KEY = os.getenv('GMAIL_API_KEY')

def get_verification_email():
    """Fetch Apple verification email from Gmail"""
    try:
        service = build('gmail', 'v1', developerKey=GMAIL_API_KEY)
        
        # Search for Apple verification emails
        results = service.users().messages().list(
            userId='me',
            q='from:apple@id.apple.com subject:verify'
        ).execute()
        
        if 'messages' in results:
            msg_id = results['messages'][0]['id']
            msg = service.users().messages().get(userId='me', id=msg_id, format='full').execute()
            
            # Extract verification link
            for header in msg['payload']['headers']:
                if header['name'] == 'Subject' and 'verify' in header['value'].lower():
                    # Get body
                    if 'parts' in msg['payload']:
                        for part in msg['payload']['parts']:
                            if part['mimeType'] == 'text/html':
                                body_data = part['body']['data']
                                body_decoded = base64.urlsafe_b64decode(body_data).decode('utf-8')
                                
                                # Extract URL
                                import re
                                match = re.search(r'href="([^"]+verify[^"]+)"', body_decoded)
                                if match:
                                    return match.group(1)
                    else:
                        body_data = msg['payload']['body']['data']
                        body_decoded = base64.urlsafe_b64decode(body_data).decode('utf-8')
                        import re
                        match = re.search(r'href="([^"]+verify[^"]+)"', body_decoded)
                        if match:
                            return match.group(1)
        
        return None
    except Exception as e:
        print(f"Error fetching email: {e}")
        return None

if __name__ == "__main__":
    link = get_verification_email()
    if link:
        print(link)
    else:
        sys.exit(1)
EOF

# Create 2captcha handler
cat > solve_captcha.py << 'EOF'
#!/usr/bin/env python3
import os
import sys
import time
from twocaptcha import TwoCaptcha

CAPTCHA_KEY = os.getenv('CAPTCHA_KEY')

def solve_recaptcha_v2(site_key, page_url):
    """Solve reCAPTCHA v2 using 2captcha"""
    try:
        solver = TwoCaptcha(CAPTCHA_KEY)
        
        print(f"Solving reCAPTCHA for {page_url}...")
        result = solver.recaptcha(
            sitekey=site_key,
            url=page_url,
            version='v2'
        )
        
        return result['code']
    except Exception as e:
        print(f"Captcha solving failed: {e}")
        return None

if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Usage: solve_captcha.py <site_key> <page_url>")
        sys.exit(1)
    
    site_key = sys.argv[1]
    page_url = sys.argv[2]
    
    code = solve_recaptcha_v2(site_key, page_url)
    if code:
        print(code)
    else:
        sys.exit(1)
EOF

# Create enrollment automation script
cat > enroll_apple_developer.py << 'EOF'
#!/usr/bin/env python3
import os
import sys
import time
import json
import requests
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.chrome.options import Options

# Environment variables
APPLE_CARD = os.getenv('APPLE_CARD')
CAPTCHA_KEY = os.getenv('CAPTCHA_KEY')
GMAIL_API_KEY = os.getenv('GMAIL_API_KEY')

def setup_driver():
    """Setup Chrome driver with Kiwi-like settings"""
    options = Options()
    options.add_argument('--headless')
    options.add_argument('--no-sandbox')
    options.add_argument('--disable-dev-shm-usage')
    options.add_argument('--user-agent=Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Mobile Safari/537.36')
    
    driver = webdriver.Chrome(options=options)
    return driver

def get_verification_link():
    """Get Apple verification link from email"""
    import subprocess
    result = subprocess.run(['python3', 'parse_verification_email.py'], 
                          capture_output=True, text=True)
    if result.returncode == 0:
        return result.stdout.strip()
    return None

def solve_captcha(site_key, page_url):
    """Solve reCAPTCHA"""
    import subprocess
    result = subprocess.run(['python3', 'solve_captcha.py', site_key, page_url],
                          capture_output=True, text=True)
    if result.returncode == 0:
        return result.stdout.strip()
    return None

def enroll_developer(driver, verification_link):
    """Complete Apple Developer enrollment"""
    try:
        print(f"Opening verification link: {verification_link}")
        driver.get(verification_link)
        time.sleep(3)
        
        # Wait for login
        wait = WebDriverWait(driver, 20)
        
        # Fill enrollment form
        print("Filling enrollment form...")
        
        # Select Individual entity
        individual_radio = wait.until(EC.element_to_be_clickable(
            (By.CSS_SELECTOR, "input[value='individual']")
        ))
        individual_radio.click()
        
        # Enter name (from Apple ID - would need to be passed in)
        name_field = wait.until(EC.presence_of_element_located(
            (By.ID, "firstName")
        ))
        # This would come from the Apple ID creation phase
        name_field.send_keys("Sarah Johnson")
        
        last_name_field = driver.find_element(By.ID, "lastName")
        last_name_field.send_keys("Smith")
        
        # D-U-N-S is blank for individual
        # Skip if present
        
        # Payment information
        card_field = wait.until(EC.presence_of_element_located(
            (By.ID, "cardNumber")
        ))
        card_field.send_keys(APPLE_CARD)
        
        # Handle potential captcha
        try:
            captcha_element = driver.find_element(By.CSS_SELECTOR, "[data-sitekey]")
            site_key = captcha_element.get_attribute("data-sitekey")
            page_url = driver.current_url
            
            print("Detected captcha, solving...")
            captcha_token = solve_captcha(site_key, page_url)
            
            if captcha_token:
                driver.execute_script(f"""
                    document.getElementById('g-recaptcha-response').innerHTML = '{captcha_token}';
                    document.getElementById('g-recaptcha-response').style.display = 'block';
                """)
        except:
            print("No captcha detected or already solved")
        
        # Submit form
        submit_btn = wait.until(EC.element_to_be_clickable(
            (By.CSS_SELECTOR, "button[type='submit']")
        ))
        submit_btn.click()
        
        # Wait for success
        time.sleep(5)
        
        # Extract Team ID
        page_source = driver.page_source
        import re
        team_match = re.search(r'Team ID: ([A-Z0-9]{10})', page_source)
        
        if team_match:
            team_id = team_match.group(1)
            print(f"✅ Enrollment successful! Team ID: {team_id}")
            
            # Write to file
            with open('/tmp/team_id.txt', 'w') as f:
                f.write(team_id)
            
            return team_id
        else:
            print("❌ Could not extract Team ID")
            return None
            
    except Exception as e:
        print(f"Enrollment failed: {e}")
        return None

def main():
    """Main execution"""
    print("Starting Apple Developer enrollment...")
    
    # Wait for verification email
    print("Waiting for verification email (60s)...")
    time.sleep(60)
    
    # Get verification link
    verification_link = get_verification_link()
    if not verification_link:
        print("❌ Could not get verification link")
        sys.exit(1)
    
    # Setup driver
    driver = setup_driver()
    
    try:
        # Complete enrollment
        team_id = enroll_developer(driver, verification_link)
        
        if team_id:
            print("✅ Phase 01 complete!")
            sys.exit(0)
        else:
            print("❌ Phase 01 failed")
            sys.exit(1)
    finally:
        driver.quit()

if __name__ == "__main__":
    main()
EOF

# Make scripts executable
chmod +x parse_verification_email.py
chmod +x solve_captcha.py
chmod +x enroll_apple_developer.py

echo "✅ Phase 01 script created successfully!"
echo ""
echo "Required environment variables:"
echo "  - GMAIL_API_KEY: Gmail API key for email parsing"
echo "  - CAPTCHA_KEY: 2captcha API key"
echo "  - APPLE_CARD: Payment card number"
echo ""
echo "Usage: bash phase-01.sh"
echo "Output: /tmp/team_id.txt"