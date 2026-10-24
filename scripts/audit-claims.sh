#!/usr/bin/env bash
# scripts/audit-claims.sh
# Verifies zero hardcoded admin emails or phone numbers in src/

set -e

echo "=== Auditing src/ for hardcoded admin credentials & claims leaks ==="

# Check for hardcoded ADMIN_EMAILS in src/
LEAKS=$(grep -rn "ADMIN_EMAILS" src/ || true)
if [ -n "$LEAKS" ]; then
  echo "FAIL: Found references to ADMIN_EMAILS in src/:"
  echo "$LEAKS"
  exit 1
fi

PHONE_LEAKS=$(grep -rn "ADMIN_PHONE" src/ || true)
if [ -n "$PHONE_LEAKS" ]; then
  echo "FAIL: Found references to ADMIN_PHONE in src/:"
  echo "$PHONE_LEAKS"
  exit 1
fi

RAW_FOUNDER=$(grep -rn "miteshpipaliya2202@gmail.com" src/ || true)
if [ -n "$RAW_FOUNDER" ]; then
  echo "FAIL: Found founder email directly hardcoded in src/:"
  echo "$RAW_FOUNDER"
  exit 1
fi

echo "PASS: Zero hardcoded admin credentials found in src/."
