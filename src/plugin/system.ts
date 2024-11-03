import os from 'os';

const system = async (messages: any[], waset: any) => {
  try {
  const message = messages[0];
  const cmd = message?.message?.conversation?.toLowerCase() || message?.message?.extendedTextMessage?.text?.toLowerCase();
  if (cmd === "/system") {
    const startTime = new Date().getTime();
    const from = message?.key?.remoteJid;
    
    // Function to convert bytes to GB
    const toGB = (bytes: number) => (bytes / (1024 ** 3)).toFixed(2) + ' GB';
    
    // Get system information
    const systemInfo = {
      'OS': os.type(),
      'Platform': os.platform(),
      'Architecture': os.arch(),
      'Hostname': os.hostname(),
      'CPU Model': os.cpus()[0]?.model,
      'CPU Cores': os.cpus().length,
      'Total Memory': toGB(os.totalmem()),
      'Free Memory': toGB(os.freemem()),
      'System Uptime': (os.uptime() / 3600).toFixed(2) + ' hours',
      'User': os.userInfo().username,
    };
    
    // Build output message
    let output = '==================== System Information ====================\n';
    for (const [key, value] of Object.entries(systemInfo)) {
      output += `${key.padEnd(20)}: ${value}\n`;
    }
    
    // Add network interfaces information
    output += '\n==================== Network Interfaces ====================\n';
    const networkInterfaces = os.networkInterfaces();
    for (const [iface, details] of Object.entries(networkInterfaces)) {
      output += `Interface: ${iface}\n`;
      details?.forEach(detail => {
        output += `  - Address: ${detail.address}\n`;
        output += `    Family: ${detail.family}\n`;
        output += `    Internal: ${detail.internal}\n`;
      });
    }
    
    // Send the output to the user
    await waset.sendMessage(from, { text: output });
  }
} catch (err) {
  console.log(err)
}
};

export default system;