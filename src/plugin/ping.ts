const ping = async (messages: any[], waset: any) => {
  const message = messages[0]; 
  const cmd = message?.message?.conversation?.toLowerCase() || message?.message?.extendedTextMessage?.text?.toLowerCase();
  if (cmd === "/ping") {
    const startTime = new Date().getTime();
    const from = message?.key?.remoteJid; 
    const { key } = await waset.sendMessage(from, { text: 'Pinging...' }, { quoted: message });
    await waset.sendMessage(from, { react: { text: '🍌', key: message?.key } });
    const responseTime = `*Respond Speed: ${new Date().getTime() - startTime} ms*`;
    await waset.sendMessage(from, {
      text: responseTime,
      edit: key,
    });
    await waset.sendMessage(from, { react: { text: '🍑', key: message?.key } });
 
  }
};

export default ping;