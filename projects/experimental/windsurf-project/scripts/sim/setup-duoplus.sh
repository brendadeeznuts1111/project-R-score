#!/bin/bash
# scripts/setup-duoplus.sh

echo "Setting up DuoPlus device for Apple ID creation..."
echo "=================================================="

# 1. Check ADB installation
if ! command -v adb &> /dev/null; then
    echo "❌ ADB not found. Installing..."
    
    if [[ "$OSTYPE" == "darwin"* ]]; then
        brew install android-platform-tools
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        sudo apt update
        sudo apt install android-tools-adb android-tools-fastboot
    else
        echo "Please install ADB manually from: https://developer.android.com/studio/releases/platform-tools"
        exit 1
    fi
fi

# 2. Enable developer options (instructions)
echo ""
echo "📱 Please enable Developer Options on your DuoPlus:"
echo "   1. Go to Settings → About Phone"
echo "   2. Tap 'Build Number' 7 times"
echo "   3. Go back to Settings → Developer Options"
echo "   4. Enable:"
echo "      - USB Debugging"
echo "      - Stay Awake"
echo "      - Disable Permission Monitoring"
echo ""
read -p "Press Enter when ready..."

# 3. Check device connection
echo ""
echo "🔍 Checking device connection..."
DEVICE_COUNT=$(adb devices | grep -c "device$")

if [ "$DEVICE_COUNT" -eq 0 ]; then
    echo "❌ No devices found. Please:"
    echo "   - Connect DuoPlus via USB"
    echo "   - Tap 'Allow' on the USB debugging prompt"
    echo "   - Run this script again"
    exit 1
fi

echo "✅ Found $DEVICE_COUNT device(s)"

# 4. Get device info
echo ""
echo "📊 Device Information:"
adb shell getprop ro.product.model
adb shell getprop ro.build.version.release
adb shell getprop ro.product.manufacturer

# 5. Install Node.js/Bun if needed
echo ""
echo "🛠 Checking runtime..."
if ! command -v bun &> /dev/null; then
    echo "Installing Bun..."
    curl -fsSL https://bun.sh/install | bash
    source ~/.bashrc
fi

# 6. Install dependencies
echo ""
echo "📦 Installing project dependencies..."
npm install
# OR if using Bun:
bun install

echo ""
echo "=================================================="
echo "✅ Setup complete! You can now run:"
echo ""
echo "   bun run create-appleid"
echo "   OR"
echo "   node scripts/run-duoplus-creation.js"
echo ""
echo "=================================================="