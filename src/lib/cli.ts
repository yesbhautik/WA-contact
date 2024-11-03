import inquirer from 'inquirer';

interface AuthOptions {
  usePairingCode: boolean;
  useQR: boolean;
}

export async function askAuthMethod(): Promise<string> {
  const answer = await inquirer.prompt<{ authMethod: string }>({
    name: 'authMethod',
    type: 'list',
    message: 'Select authentication method:',
    choices: ['Pairing Code', 'QR Code', 'Mobile OTP'],
  });
  return answer.authMethod;
}

export async function askMobileNumber(): Promise<string> {
  const country = await inquirer.prompt<{ code: string }>({
    name: 'code',
    type: 'input',
    message: 'Enter your country code:',
  });

  const mobile = await inquirer.prompt<{ number: string }>({
    name: 'number',
    type: 'input',
    message: 'Enter your mobile number:',
  });

  const countryCode = country.code;
  const mobileNumber = mobile.number;

  return `${countryCode}${mobileNumber}`;
}

export function setAuthOptions(authMethod: string): AuthOptions {
  const usePairingCode = authMethod === 'Pairing Code';
  const useQR = authMethod === 'QR Code';

  return { usePairingCode, useQR };
}