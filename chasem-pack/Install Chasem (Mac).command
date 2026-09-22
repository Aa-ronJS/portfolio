#!/bin/bash
cd "$(dirname "$0")" || exit 1
bash "mac/install.sh"
echo
read -r -p "Press Return to close this window. " _
