# Roblox Account Manager for Mac

A less functional port of ic3wolf's Roblox Account Manager from C# to JavaScript, mostly generated using Claude 3.7 Sonnet.

## Important Prerequisite: Multi-Roblox Installation

**REQUIRED**: Before using this account manager, you MUST install the Multi-Roblox program for macOS:

- Repository: [Multi-Roblox for macOS](https://github.com/Insadem/multi-roblox-macos)
- This program is essential for running multiple Roblox instances simultaneously
- Without this, you will NOT be able to launch multiple Roblox accounts at the same time

### Multi-Roblox Installation Steps
1. Go to the [Multi-Roblox macOS repository](https://github.com/Insadem/multi-roblox-macos)
2. Follow the installation instructions in the repository
3. Ensure the program is running before attempting to launch multiple Roblox instances

## Overview

This project aims to provide a Mac-compatible alternative to the original Roblox Account Manager, designed to work seamlessly with the associated Roblox Control Panel.

## Project Links

- Original Project: [Roblox Control Panel](https://github.com/dader34/roblox-control-panel)
- Inspired by: ic3wolf's Roblox Account Manager (C# version)
- Multi-Roblox macOS: [Multi-Roblox Program](https://github.com/Insadem/multi-roblox-macos)

## Prerequisites

- Node.js installed
- npm (Node Package Manager)
- [Multi-Roblox macOS program](https://github.com/Insadem/multi-roblox-macos) installed and running

## Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/dader34/roblox-account-manager-mac.git
   cd roblox-account-manager-mac
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

## Running the Application

1. Ensure Multi-Roblox is running
2. Start the application:
   ```bash
   node index.js
   ```

## Features

- Roblox account storage
- Roblox account launching
- Command line interface
- Compatible with Roblox Control Panel
- Lightweight JavaScript implementation

## Issues

- Express server logs can sometimes mess up command line inputs, just press enter to get back to the main menu

## Limitations

- ui isnt perfect (might do soon)
- Less functional compared to the original windows version
- Designed for Mac os only
- Requires the Multi-Roblox program to launch multiple instances

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.


## Acknowledgments

- [ic3wolf](https://github.com/ic3w0lf22) for the original Roblox Account Manager
- [Insadem](https://github.com/Insadem) for the Multi-Roblox macOS program