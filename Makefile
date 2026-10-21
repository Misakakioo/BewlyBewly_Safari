# Build BewlyCat for Safari as ~/Desktop/BewlyCat-Safari.zip.
# Load it: Safari → Settings → Developer → tick "Allow unsigned extensions" → "Add Temporary Extension…" → pick the zip.
# Safari drops temporary extensions when it quits, so re-add the zip after each restart.
ZIP := $(HOME)/Desktop/BewlyCat-Safari.zip

ship:
	pnpm build-safari
	rm -f $(ZIP)
	ditto -c -k --norsrc extension-safari $(ZIP)

.PHONY: ship
