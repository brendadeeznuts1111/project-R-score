#!/bin/bash
# Phase 02: Automatic App Bundle Skeleton Generator
# Pull Git repo and trigger GitHub Actions for Xcode build

set -e

echo "📦 Phase 02: App Bundle Skeleton Generator"
echo "=========================================="

# Validate required environment variables
required_vars=("GITHUB_TOKEN" "GCP_SA")
for var in "${required_vars[@]}"; do
  if [ -z "${!var}" ]; then
    echo "❌ Missing required environment variable: $var"
    exit 1
  fi
done

# Read Team ID from previous phase
if [ ! -f "/tmp/team_id.txt" ]; then
  echo "❌ Team ID not found. Run phase-01 first."
  exit 1
fi

TEAM_ID=$(cat /tmp/team_id.txt)
echo "📋 Using Team ID: $TEAM_ID"

# Create app generation directory
APP_DIR="/data/local/tmp/app-generator"
mkdir -p "$APP_DIR"
cd "$APP_DIR"

# Install required tools
echo "📦 Installing dependencies..."
apt update && apt install -y curl wget jq git python3 python3-pip

# Install GitHub CLI
if ! command -v gh &> /dev/null; then
  echo "🔧 Installing GitHub CLI..."
  curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg | dd of=/usr/share/keyrings/githubcli-archive-keyring.gpg
  echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" | tee /etc/apt/sources.list.d/github-cli.list > /dev/null
  apt update
  apt install -y gh
fi

# Generate random bundle ID
RAND_NUM=$(shuf -i 1000-9999 -n 1)
BUNDLE_ID="com.sarah${RAND_NUM}.app"
echo "🎯 Generated Bundle ID: $BUNDLE_ID"

# Configure GitHub CLI
echo "🔐 Configuring GitHub CLI..."
echo "$GITHUB_TOKEN" | gh auth login --with-token

# Create minimal SwiftUI project skeleton
echo "🏗️ Creating SwiftUI project skeleton..."
mkdir -p "SarahApp/SarahApp"
cd "SarahApp"

# Create project structure
cat > SarahApp.xcodeproj/project.pbxproj << 'EOF'
// !$*UTF8*$!
{
	archiveVersion = 1;
	classes = {
	};
	objectVersion = 54;
	objects = {

/* Begin PBXBuildFile section */
		2A1234567890123456789012 /* AppDelegate.swift in Sources */ = {isa = PBXBuildFile; fileRef = 2A1234567890123456789013 /* AppDelegate.swift */; };
		2A1234567890123456789014 /* SceneDelegate.swift in Sources */ = {isa = PBXBuildFile; fileRef = 2A1234567890123456789015 /* SceneDelegate.swift */; };
		2A1234567890123456789016 /* ContentView.swift in Sources */ = {isa = PBXBuildFile; fileRef = 2A1234567890123456789017 /* ContentView.swift */; };
/* End PBXBuildFile section */

/* Begin PBXFileReference section */
		2A1234567890123456789013 /* AppDelegate.swift */ = {isa = PBXFileReference; lastKnownFileType = sourcecode.swift; path = AppDelegate.swift; sourceTree = "<group>"; };
		2A1234567890123456789015 /* SceneDelegate.swift */ = {isa = PBXFileReference; lastKnownFileType = sourcecode.swift; path = SceneDelegate.swift; sourceTree = "<group>"; };
		2A1234567890123456789017 /* ContentView.swift */ = {isa = PBXFileReference; lastKnownFileType = sourcecode.swift; path = ContentView.swift; sourceTree = "<group>"; };
		2A1234567890123456789019 /* Info.plist */ = {isa = PBXFileReference; lastKnownFileType = text.plist.xml; path = Info.plist; sourceTree = "<group>"; };
/* End PBXFileReference section */

/* Begin PBXGroup section */
		2A1234567890123456789012 /* SarahApp */ = {
			isa = PBXGroup;
			children = (
				2A1234567890123456789013 /* AppDelegate.swift */,
				2A1234567890123456789015 /* SceneDelegate.swift */,
				2A1234567890123456789017 /* ContentView.swift */,
				2A1234567890123456789019 /* Info.plist */,
			);
			path = SarahApp;
			sourceTree = "<group>";
		};
/* End PBXGroup section */

/* Begin PBXNativeTarget section */
		2A1234567890123456789018 /* SarahApp */ = {
			isa = PBXNativeTarget;
			buildConfigurationList = 2A1234567890123456789020 /* Build configuration list for PBXNativeTarget "SarahApp" */;
			buildPhases = (
				2A123456789012345678901A /* Sources */,
				2A123456789012345678901B /* Resources */,
			);
			buildRules = (
			);
			dependencies = (
			);
			name = SarahApp;
			productName = SarahApp;
			productReference = 2A123456789012345678901C /* SarahApp.app */;
			productType = "com.apple.product-type.application";
		};
/* End PBXNativeTarget section */

/* Begin PBXProject section */
		2A1234567890123456789011 /* Project object */ = {
			isa = PBXProject;
			attributes = {
				LastSwiftUpdateCheck = 1400;
				LastUpgradeCheck = 1400;
				TargetAttributes = {
					2A1234567890123456789018 = {
						CreatedOnToolsVersion = 14.0;
					};
				};
			};
			buildConfigurationList = 2A1234567890123456789010 /* Build configuration list for PBXProject "SarahApp" */;
			compatibilityVersion = "Xcode 14.0";
			developmentRegion = en;
			hasScannedForEncodings = 0;
			knownRegions = (
				en,
				Base,
			);
			mainGroup = 2A1234567890123456789012 /* SarahApp */;
			productRefGroup = 2A1234567890123456789012 /* SarahApp */;
			projectDirPath = "";
			projectRoot = "";
			targets = (
				2A1234567890123456789018 /* SarahApp */,
			);
		};
/* End PBXProject section */

/* Begin PBXSourcesBuildPhase section */
		2A123456789012345678901A /* Sources */ = {
			isa = PBXSourcesBuildPhase;
			buildActionMask = 2147483647;
			files = (
				2A1234567890123456789016 /* ContentView.swift in Sources */,
				2A1234567890123456789014 /* SceneDelegate.swift in Sources */,
				2A1234567890123456789012 /* AppDelegate.swift in Sources */,
			);
			runOnlyForDeploymentPostprocessing = 0;
		};
/* End PBXSourcesBuildPhase section */

/* Begin PBXTargetDependency section */
/* End PBXTargetDependency section */

/* Begin XCBuildConfiguration section */
		2A123456789012345678901D /* Debug */ = {
			isa = XCBuildConfiguration;
			buildSettings = {
				ASSETCATALOG_COMPILER_APPICON_NAME = AppIcon;
				CODE_SIGN_IDENTITY = "Apple Development";
				CODE_SIGN_STYLE = Manual;
				CURRENT_PROJECT_VERSION = 1;
				DEVELOPMENT_TEAM = $TEAM_ID;
				INFOPLIST_FILE = SarahApp/Info.plist;
				IPHONEOS_DEPLOYMENT_TARGET = 16.0;
				LD_RUNPATH_SEARCH_PATHS = (
					"$(inherited)",
					"@executable_path/Frameworks",
				);
				MARKETING_VERSION = 1.0;
				PRODUCT_BUNDLE_IDENTIFIER = $BUNDLE_ID;
				PRODUCT_NAME = "$(TARGET_NAME)";
				SWIFT_VERSION = 5.0;
				TARGETED_DEVICE_FAMILY = "1,2";
			};
			name = Debug;
		};
		2A123456789012345678901E /* Release */ = {
			isa = XCBuildConfiguration;
			buildSettings = {
				ASSETCATALOG_COMPILER_APPICON_NAME = AppIcon;
				CODE_SIGN_IDENTITY = "Apple Development";
				CODE_SIGN_STYLE = Manual;
				CURRENT_PROJECT_VERSION = 1;
				DEVELOPMENT_TEAM = $TEAM_ID;
				INFOPLIST_FILE = SarahApp/Info.plist;
				IPHONEOS_DEPLOYMENT_TARGET = 16.0;
				LD_RUNPATH_SEARCH_PATHS = (
					"$(inherited)",
					"@executable_path/Frameworks",
				);
				MARKETING_VERSION = 1.0;
				PRODUCT_BUNDLE_IDENTIFIER = $BUNDLE_ID;
				PRODUCT_NAME = "$(TARGET_NAME)";
				SWIFT_VERSION = 5.0;
				TARGETED_DEVICE_FAMILY = "1,2";
			};
			name = Release;
		};
/* End XCBuildConfiguration section */

/* Begin XCConfigurationList section */
		2A1234567890123456789010 /* Build configuration list for PBXProject "SarahApp" */ = {
			isa = XCConfigurationList;
			buildConfigurations = (
				2A123456789012345678901D /* Debug */,
				2A123456789012345678901E /* Release */,
			);
			defaultConfigurationIsVisible = 0;
			defaultConfigurationName = Release;
		};
		2A1234567890123456789020 /* Build configuration list for PBXNativeTarget "SarahApp" */ = {
			isa = XCConfigurationList;
			buildConfigurations = (
				2A123456789012345678901D /* Debug */,
				2A123456789012345678901E /* Release */,
			);
			defaultConfigurationIsVisible = 0;
			defaultConfigurationName = Release;
		};
/* End XCConfigurationList section */
	};
	rootObject = 2A1234567890123456789011 /* Project object */;
}
EOF

# Create Swift source files
cat > SarahApp/AppDelegate.swift << 'EOF'
import UIKit

@main
class AppDelegate: UIResponder, UIApplicationDelegate {
    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        return true
    }

    func application(_ application: UIApplication, configurationForConnecting connectingSceneSession: UISceneSession, options: UIScene.ConnectionOptions) -> UISceneConfiguration {
        return UISceneConfiguration(name: "Default Configuration", sessionRole: connectingSceneSession.role)
    }
}
EOF

cat > SarahApp/SceneDelegate.swift << 'EOF'
import UIKit

class SceneDelegate: UIResponder, UIWindowSceneDelegate {
    var window: UIWindow?

    func scene(_ scene: UIScene, willConnectTo session: UISceneSession, options connectionOptions: UIScene.ConnectionOptions) {
        guard let windowScene = (scene as? UIWindowScene) else { return }
        
        window = UIWindow(windowScene: windowScene)
        window?.rootViewController = UIHostingController(rootView: ContentView())
        window?.makeKeyAndVisible()
    }
}
EOF

cat > SarahApp/ContentView.swift << 'EOF'
import SwiftUI

struct ContentView: View {
    var body: some View {
        VStack {
            Image(systemName: "globe")
                .imageScale(.large)
                .foregroundStyle(.tint)
            Text("Hello, Sarah!")
                .font(.title)
        }
        .padding()
    }
}

#Preview {
    ContentView()
}
EOF

# Create Info.plist
cat > SarahApp/Info.plist << 'EOF'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>CFBundleDevelopmentRegion</key>
    <string>$(DEVELOPMENT_LANGUAGE)</string>
    <key>CFBundleExecutable</key>
    <string>$(EXECUTABLE_NAME)</string>
    <key>CFBundleIdentifier</key>
    <string>$(PRODUCT_BUNDLE_IDENTIFIER)</string>
    <key>CFBundleInfoDictionaryVersion</key>
    <string>6.0</string>
    <key>CFBundleName</key>
    <string>$(PRODUCT_NAME)</string>
    <key>CFBundlePackageType</key>
    <string>APPL</string>
    <key>CFBundleShortVersionString</key>
    <string>$(MARKETING_VERSION)</string>
    <key>CFBundleVersion</key>
    <string>$(CURRENT_PROJECT_VERSION)</string>
    <key>LSRequiresIPhoneOS</key>
    <true/>
    <key>UIApplicationSceneManifest</key>
    <dict>
        <key>UIApplicationSupportsMultipleScenes</key>
        <false/>
        <key>UISceneConfigurations</key>
        <dict>
            <key>UIWindowSceneSessionRoleApplication</key>
            <array>
                <dict>
                    <key>UISceneConfigurationName</key>
                    <string>Default Configuration</string>
                    <key>UISceneDelegateClassName</key>
                    <string>$(PRODUCT_MODULE_NAME).SceneDelegate</string>
                </dict>
            </array>
        </dict>
    </dict>
    <key>UILaunchStoryboardName</key>
    <string>LaunchScreen</string>
    <key>UIRequiredDeviceCapabilities</key>
    <array>
        <string>armv7</string>
    </array>
    <key>UISupportedInterfaceOrientations</key>
    <array>
        <string>UIInterfaceOrientationPortrait</string>
        <string>UIInterfaceOrientationLandscapeLeft</string>
        <string>UIInterfaceOrientationLandscapeRight</string>
    </array>
    <key>UISupportedInterfaceOrientations~ipad</key>
    <array>
        <string>UIInterfaceOrientationPortrait</string>
        <string>UIInterfaceOrientationPortraitUpsideDown</string>
        <string>UIInterfaceOrientationLandscapeLeft</string>
        <string>UIInterfaceOrientationLandscapeRight</string>
    </array>
</dict>
</plist>
EOF

# Create GitHub Actions workflow
mkdir -p .github/workflows
cat > .github/workflows/build.yml << 'EOF'
name: Build iOS App

on:
  workflow_dispatch:
    inputs:
      team_id:
        description: 'Apple Team ID'
        required: true
        type: string
      bundle_id:
        description: 'Bundle Identifier'
        required: true
        type: string

jobs:
  build:
    runs-on: macos-latest
    
    steps:
    - name: Checkout code
      uses: actions/checkout@v4
      
    - name: Setup Xcode
      uses: maxim-lobanov/setup-xcode@v1
      with:
        xcode-version: '15.0'
      
    - name: Import Apple Certificate
      env:
        APPLE_CERTIFICATE: ${{ secrets.APPLE_CERTIFICATE }}
        APPLE_CERTIFICATE_PASSWORD: ${{ secrets.APPLE_CERTIFICATE_PASSWORD }}
      run: |
        echo "$APPLE_CERTIFICATE" | base64 --decode > certificate.p12
        security create-keychain -p "" build.keychain
        security import certificate.p12 -k build.keychain -P "$APPLE_CERTIFICATE_PASSWORD" -T /usr/bin/codesign
        security set-keychain-settings -t 3600 -l build.keychain
        security unlock-keychain -p "" build.keychain
      
    - name: Import Provisioning Profile
      env:
        PROVISIONING_PROFILE: ${{ secrets.PROVISIONING_PROFILE }}
      run: |
        echo "$PROVISIONING_PROFILE" | base64 --decode > profile.mobileprovision
        mkdir -p ~/Library/MobileDevice/Provisioning\ Profiles
        cp profile.mobileprovision ~/Library/MobileDevice/Provisioning\ Profiles/
      
    - name: Update Project Settings
      run: |
        # Update team ID and bundle ID
        sed -i '' "s/DEVELOPMENT_TEAM = .*/DEVELOPMENT_TEAM = ${{ github.event.inputs.team_id }};/g" SarahApp.xcodeproj/project.pbxproj
        sed -i '' "s/PRODUCT_BUNDLE_IDENTIFIER = .*/PRODUCT_BUNDLE_IDENTIFIER = ${{ github.event.inputs.bundle_id }};/g" SarahApp.xcodeproj/project.pbxproj
      
    - name: Build Archive
      run: |
        xcodebuild -project SarahApp.xcodeproj \
          -scheme SarahApp \
          -configuration Release \
          -archivePath SarahApp.xcarchive \
          archive
      
    - name: Export IPA
      run: |
        xcodebuild -exportArchive \
          -archivePath SarahApp.xcarchive \
          -exportPath export \
          -exportOptionsPlist ExportOptions.plist
      
    - name: Upload Artifact
      uses: actions/upload-artifact@v4
      with:
        name: SarahApp-${{ github.event.inputs.bundle_id }}
        path: export/SarahApp.ipa
        retention-days: 7
EOF

# Create ExportOptions.plist
cat > ExportOptions.plist << 'EOF'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>method</key>
    <string>app-store</string>
    <key>teamID</key>
    <string>TEAM_ID_PLACEHOLDER</string>
    <key>uploadSymbols</key>
    <true/>
    <key>compileBitcode</key>
    <false/>
</dict>
</plist>
EOF

# Create GitHub repo and push
echo "🚀 Creating GitHub repository..."
REPO_NAME="sarah-app-${RAND_NUM}"
gh repo create "$REPO_NAME" --private --push --source .

# Trigger workflow
echo "🔄 Triggering GitHub Actions workflow..."
WORKFLOW_ID=$(gh workflow list --json id -q '.[0].id')
gh workflow run "$WORKFLOW_ID" -f team_id="$TEAM_ID" -f bundle_id="$BUNDLE_ID"

# Wait for build
echo "⏳ Waiting for build to complete (this may take 10-15 minutes)..."
for i in {1..30}; do
  STATUS=$(gh run list --workflow="$WORKFLOW_ID" --json status -q '.[0].status' 2>/dev/null || echo "in_progress")
  
  if [ "$STATUS" = "completed" ]; then
    CONCLUSION=$(gh run list --workflow="$WORKFLOW_ID" --json conclusion -q '.[0].conclusion')
    
    if [ "$CONCLUSION" = "success" ]; then
      echo "✅ Build successful!"
      
      # Download IPA
      RUN_ID=$(gh run list --workflow="$WORKFLOW_ID" --json id -q '.[0].id')
      gh run download "$RUN_ID" --name "SarahApp-${BUNDLE_ID}" --dir ./ipa-download
      
      if [ -f "ipa-download/SarahApp.ipa" ]; then
        # Extract metadata
        mkdir -p /tmp/app-metadata
        echo "$BUNDLE_ID" > /tmp/app-metadata/bundle_id.txt
        echo "$TEAM_ID" > /tmp/app-metadata/team_id.txt
        echo "$REPO_NAME" > /tmp/app-metadata/repo_name.txt
        echo "1.0" > /tmp/app-metadata/version.txt
        echo "sarah${RAND_NUM}" > /tmp/app-metadata/sku.txt
        
        # Copy IPA to accessible location
        cp ipa-download/SarahApp.ipa /tmp/SarahApp.ipa
        
        echo "✅ Phase 02 complete!"
        echo "📱 IPA: /tmp/SarahApp.ipa"
        echo "📋 Metadata: /tmp/app-metadata/"
        exit 0
      else
        echo "❌ IPA file not found in artifacts"
        exit 1
      fi
    else
      echo "❌ Build failed: $CONCLUSION"
      gh run view "$RUN_ID" --log
      exit 1
    fi
  fi
  
  echo "⏳ Build status: $STATUS (attempt $i/30)"
  sleep 30
done

echo "❌ Build timeout"
exit 1