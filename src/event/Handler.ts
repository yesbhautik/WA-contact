import { downloadMediaMessage, generateWAMessageFromContent } from '@whiskeysockets/baileys';
import path from 'path';
import fs from 'fs/promises';

const Handler = async (messages: any, waset: any): Promise<void> => {
  try {
    const pluginFiles = await fs.readdir(path.join(process.cwd(), 'src/plugin'));
    console.log(messages)
    for (const file of pluginFiles) {
      if (file.endsWith('.ts')) {
        const pluginModule = await import(`@/plugin/${file.replace('.ts', '')}`);
        const loadPlugins = pluginModule.default;
        loadPlugins(messages, waset);
      }
    }
  } catch (e) {
    console.log(e);
  }
};

export default Handler;