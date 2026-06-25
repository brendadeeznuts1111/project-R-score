#!/bin/bash
#
# Android SDK Setup for Mobile Wallet Simulator
# Sets up environment for testing Lightning wallet apps on Android emulators
#

set -e

echo "📱 Setting up Android Wallet Simulator..."
echo ""

# Check if Android SDK is installed
if [ -z "$ANDROID_HOME" ]; then
    echo "❌ ANDROID_HOME not set."
    echo ""
    echo "Please install Android Studio:"
    echo "   Download from: https://developer.android.com/studio"
    echo ""
    echo "Then set ANDROID_HOME in your shell profile:"
    echo "   export ANDROID_HOME=\$HOME/Library/Android/sdk  # macOS"
    echo "   export ANDROID_HOME=\$HOME/Android/Sdk          # Linux"
    echo ""
    echo "And add tools to PATH:"
    echo "   export PATH=\$PATH:\$ANDROID_HOME/emulator"
    echo "   export PATH=\$PATH:\$ANDROID_HOME/platform-tools"
    echo "   export PATH=\$PATH:\$ANDROID_HOME/tools/bin"
    echo ""
    exit 1
fi

echo "✅ ANDROID_HOME found: $ANDROID_HOME"

# Add Android tools to PATH for this session
export PATH=$PATH:$ANDROID_HOME/emulator:$ANDROID_HOME/platform-tools:$ANDROID_HOME/tools/bin

# Check for required tools
echo ""
echo "Checking Android SDK tools..."

if command -v emulator &> /dev/null; then
    echo "✅ emulator found"
else
    echo "❌ emulator not found - install via Android Studio SDK Manager"
fi

if command -v adb &> /dev/null; then
    echo "✅ adb found"
else
    echo "❌ adb not found - install platform-tools via SDK Manager"
fi

if command -v avdmanager &> /dev/null; then
    echo "✅ avdmanager found"
else
    echo "❌ avdmanager not found - install cmdline-tools via SDK Manager"
fi

# List existing AVDs
echo ""
echo "📋 Existing AVDs:"
emulator -list-avds 2>/dev/null || echo "   (none found)"

# Offer to create a test AVD
echo ""
echo "Would you like to create a Lightning test AVD? (y/n)"
read -r CREATE_AVD

if [ "$CREATE_AVD" = "y" ] || [ "$CREATE_AVD" = "Y" ]; then
    echo ""
    echo "📦 Downloading Android 13 system image..."
    
    # Accept licenses first
    yes | sdkmanager --licenses 2>/dev/null || true
    
    # Download system image
    sdkmanager "system-images;android-33;google_apis;x86_64" 2>/dev/null || {
        echo "⚠️  Could not download system image. Try manually:"
        echo "   sdkmanager \"system-images;android-33;google_apis;x86_64\""
    }
    
    echo ""
    echo "🔧 Creating AVD: Lightning-Test-API33..."
    
    # Create AVD
    echo "no" | avdmanager create avd \
        -n "Lightning-Test-API33" \
        -k "system-images;android-33;google_apis;x86_64" \
        -d "pixel_5" \
        --force 2>/dev/null && {
        echo "✅ AVD created: Lightning-Test-API33"
    } || {
        echo "⚠️  Could not create AVD. Try manually via Android Studio."
    }
fi

# Summary
echo ""
echo "════════════════════════════════════════════════════════════"
echo "📱 Android SDK Setup Complete!"
echo ""
echo "To run the Mobile Wallet Simulator:"
echo "   bun run mobile-sim"
echo ""
echo "Available commands in simulator:"
echo "   S - Start selected AVD"
echo "   K - Kill selected AVD" 
echo "   I - Install APK"
echo "   L - Stream logcat"
echo "   T - Test payment simulation"
echo "   C - Compliance check"
echo "   R - Refresh AVD list"
echo "   Q - Quit"
echo ""
echo "To install a Lightning wallet APK:"
echo "   1. Download an APK (e.g., Phoenix, Breez, BlueWallet)"
echo "   2. Place it as ./sample-lightning-wallet.apk"
echo "   3. Press 'I' in the simulator to install"
echo "════════════════════════════════════════════════════════════"

