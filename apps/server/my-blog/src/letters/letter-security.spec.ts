import { ConfigService } from '@nestjs/config';
import { randomBytes } from 'crypto';
import { LetterKeys, normalizeEmail } from './letter-security';

describe('Private letter contacts', () => {
  it('preserves the local part and normalizes the email domain', () => {
    expect(normalizeEmail('Upper+tag@EXAMPLE.org')).toBe(
      'Upper+tag@example.org',
    );
  });
  it('reads old and new key versions and binds contacts to one letter', () => {
    const versions = {
      LETTERS_CONTACT_KEY_1: randomBytes(32).toString('hex'),
      LETTERS_CONTACT_KEY_2: randomBytes(32).toString('hex'),
    };
    const old = new LetterKeys(new ConfigService(versions));
    const next = new LetterKeys(
      new ConfigService({ ...versions, LETTERS_KEY_VERSION: '2' }),
    );
    const first = old.encrypt('letter-a', 'sender@example.test', '');
    const second = next.encrypt('letter-a', 'sender@example.test', '');
    expect(first).not.toEqual(second);
    for (const ciphertext of [first, second]) {
      expect(next.decrypt('letter-a', ciphertext)).toEqual({
        email: 'sender@example.test',
        phone: '',
      });
      expect(() => next.decrypt('other-letter', ciphertext)).toThrow();
    }
  });
});
