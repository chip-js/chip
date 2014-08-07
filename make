#!/bin/bash
cd "$(dirname "$0")"

grunt

cp dist/chip.js ../nextjenn-web/vendor/chip.js
cp dist/chip.js ../../../groups/client/vendor/chip.js
