# AI Nexus Workbench Dev Launcher

A comprehensive development server launcher that automatically starts your dev server in a new terminal window, keeping your current terminal free for other tasks.

## 🚀 Quick Start

```bash
# Launch dev server in new terminal (recommended)
npm run dev

# Alternative ways to launch
./scripts/launch-dev.sh
npm run dev:background    # Run in background
npm run dev:verify       # Only verify setup
npm run dev:direct       # Direct vite (old behavior)
```

## 📋 Features

### ✅ **Smart Terminal Detection**
Automatically detects and uses your preferred terminal emulator:
- **GNOME Terminal** (gnome-terminal)
- **KDE Konsole** (konsole)
- **XFCE Terminal** (xfce4-terminal)
- **MATE Terminal** (mate-terminal)
- **LXTerminal** (lxterminal)
- **Terminator** (terminator)
- **Tilix** (tilix)
- **Kitty** (kitty)
- **Alacritty** (alacritty)
- **XTerm** (xterm)

### ✅ **Automatic Setup Verification**
Before launching, the script automatically:
1. **Verifies project structure** (package.json, node_modules)
2. **Installs dependencies** if missing
3. **Starts DynamoDB Local** if not running
4. **Checks for existing dev servers** to prevent conflicts

### ✅ **Intelligent Fallback**
If no supported terminal is found, automatically falls back to:
- **Background mode** with logging
- **Direct execution** with user confirmation

### ✅ **Process Management**
- **Conflict Detection**: Warns if dev server already running
- **Clean Shutdown**: Proper process cleanup
- **Log Management**: Background logs with monitoring commands

## 🛠️ Available Commands

| Command | Description | Terminal | Background |
|---------|-------------|----------|------------|
| `npm run dev` | **Launch in new terminal** (recommended) | ✅ | ❌ |
| `npm run dev:direct` | Direct vite execution (blocks terminal) | ❌ | ❌ |
| `npm run dev:background` | Run in background with logs | ❌ | ✅ |
| `npm run dev:verify` | Only verify setup, don't launch | ❌ | ❌ |

## 🔧 Command Line Options

```bash
./scripts/launch-dev.sh [options]

Options:
  --help, -h        Show help message
  --background, -b  Run in background mode (no new terminal)
  --verify, -v      Only verify setup, don't launch
```

## 📱 Usage Examples

### Normal Development (Recommended)
```bash
npm run dev
```
**What happens:**
1. ✅ Verifies project setup
2. 🚀 Opens new terminal window  
3. ▶️ Starts dev server automatically
4. 💻 Your current terminal stays free

### Background Development
```bash
npm run dev:background
```
**What happens:**
1. ✅ Verifies project setup
2. 🔄 Runs dev server in background
3. 📝 Creates `dev-server.log` file
4. 💻 Returns control to terminal

**Monitor background process:**
```bash
tail -f dev-server.log        # Watch logs
pkill -f "npm run dev"        # Stop server
```

### Setup Verification Only
```bash
npm run dev:verify
```
**What happens:**
1. ✅ Checks dependencies
2. 🗄️ Starts DynamoDB if needed
3. 📊 Reports status
4. ❌ Doesn't start dev server

### Direct Execution (Old Behavior)
```bash
npm run dev:direct
```
**What happens:**
1. ▶️ Runs `vite` directly
2. 🔒 Blocks current terminal
3. ❌ No automatic setup verification

## 🎯 What the Launcher Does

### 1. **Project Verification** 
- ✅ Confirms `package.json` exists
- ✅ Installs `node_modules` if missing
- ✅ Ensures DynamoDB Local is running

### 2. **Environment Setup**
- 🐳 Starts Docker containers (DynamoDB + Admin UI)
- 📊 Verifies table creation and seeding
- 🔗 Tests database connectivity

### 3. **Terminal Management**
- 🔍 Detects best available terminal
- 🚀 Launches with proper working directory
- 📱 Sets descriptive window title
- 🎨 Adds colorful startup message

### 4. **Process Monitoring**
- ⚠️ Warns about existing dev servers
- 📊 Provides process information
- 🛑 Offers graceful shutdown options
- 📝 Maintains detailed logs

## 🐳 DynamoDB Integration

The launcher automatically manages your local development database:

```bash
# These services start automatically:
http://localhost:8002   # DynamoDB Local API
http://localhost:8001   # DynamoDB Admin UI

# Manual database management:
npm run dynamodb:start    # Start DynamoDB Local
npm run dynamodb:stop     # Stop DynamoDB Local  
npm run dynamodb:status   # Check status
npm run dynamodb:reset    # Reset all data
npm run dynamodb:setup    # Re-create tables
npm run dynamodb:admin    # Open admin UI
```

## 🔧 Troubleshooting

### **Terminal doesn't open**
```bash
# Check which terminal is detected:
./scripts/launch-dev.sh --verify

# Force background mode:
npm run dev:background

# Use direct mode:
npm run dev:direct
```

### **Port conflicts**
```bash
# Check what's running on common ports:
lsof -i :8080 -i :8081 -i :8082 -i :8083 -i :8084

# Kill existing dev servers:
pkill -f "npm run dev"
pkill -f "vite"
```

### **DynamoDB issues**
```bash
# Restart DynamoDB Local:
npm run dynamodb:stop
npm run dynamodb:start

# Reset database:
npm run dynamodb:reset
npm run dynamodb:setup
```

### **Missing dependencies**
```bash
# Force dependency check:
npm run dev:verify

# Manual dependency install:
npm install

# Clear caches:
npm run clean
npm install
```

## 📁 File Structure

```
scripts/
├── launch-dev.sh           # Main launcher script
├── dev                     # Simple wrapper script  
├── dynamodb-local.sh       # DynamoDB management
├── DEV-LAUNCHER-README.md  # This documentation
└── ...other scripts
```

## 🎨 Terminal Output

The launcher provides colorful, informative output:

```bash
🚀 AI Nexus Workbench Dev Server Launcher
===========================================

📁 Project Directory: /path/to/ai-nexus-workbench

🔍 Verifying project setup...
✅ Project setup verified

🔍 Detecting terminal emulator...
✅ Found terminal: gnome-terminal

🚀 Launching dev server in new terminal...
✅ Dev server launched successfully!

📋 What happens next:
  1. A new terminal window will open
  2. The dev server will start automatically  
  3. Your app will be available at http://localhost:808X
  4. This terminal remains free for other tasks

💡 To stop the dev server: Close the new terminal or press Ctrl+C in it
🔧 DynamoDB Admin UI: http://localhost:8001
```

## 🚀 Benefits

### **For Developers:**
- ✅ **Non-blocking**: Keep working in current terminal
- ✅ **Automatic**: No manual setup steps needed
- ✅ **Reliable**: Handles errors and conflicts gracefully
- ✅ **Informative**: Clear status messages and next steps

### **For Teams:**
- ✅ **Consistent**: Same experience across all environments
- ✅ **Documented**: Clear usage instructions
- ✅ **Maintainable**: Well-structured, commented code
- ✅ **Flexible**: Multiple execution modes available

---

**🎯 Result**: One command (`npm run dev`) gives you a fully working development environment in a new terminal, while keeping your current workspace clean and available for other tasks.
