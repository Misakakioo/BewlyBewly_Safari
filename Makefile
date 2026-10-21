# Build BewlyCat for Safari and install it as /Applications/BewlyCat.app, signed with your
# Apple Development certificate (free Personal Team) so Safari keeps it across restarts.
# Needs your Apple ID in Xcode → Settings → Apple Accounts, plus an "Apple Development" certificate
# (Personal Team → Manage Certificates… → + → Apple Development). It lasts a year; make a new one when it expires.
# Restart Safari afterwards: it keeps running the copy it loaded at launch.

# Team ID is read from your first usable Apple Development signing identity: lines macOS marks CSSMERR_*
# (expired, revoked, untrusted) are skipped. Several Apple IDs? Override with `make ship TEAM=XXXXXXXXXX`.
TEAM ?= $(shell security find-identity -p codesigning 2>/dev/null | grep '"Apple Development: ' | grep -v CSSMERR | head -1 \
	| sed -E 's/.*"(.*)".*/\1/' | xargs -I{} security find-certificate -c {} -p 2>/dev/null \
	| openssl x509 -noout -subject 2>/dev/null | sed -n 's/.*OU=\([A-Z0-9]*\).*/\1/p')
# Building it yourself? Pick your own ID, e.g. `make ship BUNDLE_ID=com.yourname.BewlyCat`.
BUNDLE_ID ?= com.misakakioo.BewlyCat
APP := extension-safari-macos/build/Build/Products/Release/BewlyCat.app
LSREGISTER := /System/Library/Frameworks/CoreServices.framework/Frameworks/LaunchServices.framework/Support/lsregister

ship:
	@test -n "$(TEAM)" || { echo "No Apple Development certificate found. See README → 安装."; exit 1; }
	pnpm build-safari
	xcrun safari-web-extension-converter ./extension-safari --project-location ./extension-safari-macos \
		--macos-only --swift --app-name BewlyCat --bundle-identifier $(BUNDLE_ID) --no-open --no-prompt --force
	xcodebuild -quiet -project extension-safari-macos/BewlyCat/BewlyCat.xcodeproj -scheme BewlyCat -configuration Release \
		-derivedDataPath extension-safari-macos/build -allowProvisioningUpdates \
		CODE_SIGN_STYLE=Automatic DEVELOPMENT_TEAM=$(TEAM) CODE_SIGN_IDENTITY="Apple Development" \
		MARKETING_VERSION=$$(node -p "require('./extension-safari/manifest.json').version") build
	# Unregister the build-folder copy, or Safari lists two BewlyCats with the same ID and enables neither.
	$(LSREGISTER) -u $(APP)
	rm -rf /Applications/BewlyCat.app && mv $(APP) /Applications/BewlyCat.app
	open /Applications/BewlyCat.app

.PHONY: ship
