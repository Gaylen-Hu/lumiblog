import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  createHmac,
  createCipheriv,
  createDecipheriv,
  randomBytes,
} from 'crypto';

export function normalizeEmail(email: string) {
  const at = email.lastIndexOf('@');
  return email.slice(0, at + 1) + email.slice(at + 1).toLowerCase();
}

@Injectable()
export class LetterKeys {
  constructor(private readonly config: ConfigService) {}
  private key(name: string) {
    const value = this.config.get<string>(name) ?? '';
    if (!/^[a-f0-9]{64}$/i.test(value))
      throw new ServiceUnavailableException(
        'Mailbox configuration unavailable',
      );
    return Buffer.from(value, 'hex');
  }
  digest(purpose: string, value: string) {
    return createHmac('sha256', this.key('LETTERS_INDEX_KEY'))
      .update(purpose + '\0' + value)
      .digest('hex');
  }
  encrypt(id: string, email: string, phone: string) {
    const version = this.config.get<string>('LETTERS_KEY_VERSION') || '1';
    if (!/^\d{1,3}$/.test(version))
      throw new ServiceUnavailableException('Mailbox key unavailable');
    const iv = randomBytes(12);
    const cipher = createCipheriv(
      'aes-256-gcm',
      this.key('LETTERS_CONTACT_KEY_' + version),
      iv,
    );
    cipher.setAAD(Buffer.from(id));
    const data = Buffer.concat([
      cipher.update(JSON.stringify({ email, phone })),
      cipher.final(),
    ]);
    return [
      version,
      iv.toString('base64'),
      cipher.getAuthTag().toString('base64'),
      data.toString('base64'),
    ].join('.');
  }
  decrypt(id: string, value: string) {
    const [version, iv, tag, data] = value.split('.');
    const cipher = createDecipheriv(
      'aes-256-gcm',
      this.key('LETTERS_CONTACT_KEY_' + version),
      Buffer.from(iv, 'base64'),
    );
    cipher.setAAD(Buffer.from(id));
    cipher.setAuthTag(Buffer.from(tag, 'base64'));
    return JSON.parse(
      Buffer.concat([
        cipher.update(Buffer.from(data, 'base64')),
        cipher.final(),
      ]).toString(),
    ) as { email: string; phone: string };
  }
}
