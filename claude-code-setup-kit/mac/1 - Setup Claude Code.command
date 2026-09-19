#!/bin/bash
# Double-click this file. It runs the setup script in the "lib" folder
# next to it. It never asks for your administrator password.
cd "$(dirname "$0")" || exit 1
bash "lib/setup.sh"
echo
read -r -p "Press Return to close this window. " _
