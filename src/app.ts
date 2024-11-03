import 'source-map-support/register';
import makeWASocket, { useMultiFileAuthState, makeInMemoryStore, Browsers, DisconnectReason, fetchLatestBaileysVersion } from '@whiskeysockets/baileys'
import { askMobileNumber } from '@/lib/cli'
import { Handler } from '@/event'
import { Boom } from '@hapi/boom'

const store = makeInMemoryStore({ })
store.readFromFile('./data.json')
setInterval(() => {
    store.writeToFile('./data.json')
}, 10_000);

const startSocket = async () => {
  const { version } = await fetchLatestBaileysVersion()
  const { state, saveCreds } = await useMultiFileAuthState('session')
  const waset = makeWASocket({
     version,
     syncFullHistory: true,
     printQRInTerminal: false,
     auth: state
  });
  
  store.bind(waset.ev);
  
  if (!waset.authState.creds.registered) {
      const phoneNumber = await askMobileNumber();
      const code = await waset.requestPairingCode(phoneNumber);
      console.log((`YOUR PAIRING CODE: `), code);
    }
    
  waset.ev.on ('creds.update', saveCreds);
  waset.ev.on('messages.upsert', async ({ messages }) => await Handler(messages, waset));
  waset.ev.on('contacts.upsert', () => {
    console.log('got contacts', Object.values(store.contacts))
  });
  waset.ev.on('connection.update', (update: any) => {
    const { connection, lastDisconnect } = update
      if(connection === 'close') {
        const shouldReconnect = (lastDisconnect?.error as Boom)?.output?.statusCode !== DisconnectReason.loggedOut
        console.log('connection closed due to ', lastDisconnect?.error, ', reconnecting ', shouldReconnect)
        if(shouldReconnect) {
           startSocket()
        }
      } else if(connection === 'open') {
        console.log('opened connection')
    }
  });
}

startSocket();