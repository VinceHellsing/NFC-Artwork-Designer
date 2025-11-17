#!/bin/bash
# Launches the NFC Artwork Designer dev server on Mac

# Get the directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed!"
    echo ""
    echo "Please install Node.js first:"
    echo "1. Visit https://nodejs.org/"
    echo "2. Download the LTS version for macOS"
    echo "3. Install it and restart Terminal"
    echo ""
    echo "Or install via Homebrew:"
    echo "  brew install node"
    exit 1
fi

echo "✓ Node.js is installed: $(node --version)"
echo ""

# Check if node_modules exists, if not install dependencies
if [ ! -d "node_modules" ]; then
    echo "Installing npm dependencies..."
    npm install
    if [ $? -ne 0 ]; then
        echo "❌ Failed to install dependencies"
        exit 1
    fi
else
    echo "✓ Dependencies already installed"
fi

echo ""
echo "Starting Vite dev server..."
echo "The app will open in your default browser at http://localhost:5173"
echo "Press Ctrl+C to stop the server"
echo ""

# Start the dev server
npm run dev

