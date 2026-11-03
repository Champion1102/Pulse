import { randomInt } from 'crypto';

export interface RoomCodeGenerator {
  generate(isTaken: (code: string) => boolean): string;
}

/** 6-character codes without look-alike characters (no 0/O, 1/I/L). */
export class RandomRoomCodeGenerator implements RoomCodeGenerator {
  private static readonly ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

  constructor(private readonly length = 6) {}

  generate(isTaken: (code: string) => boolean): string {
    for (let attempt = 0; attempt < 100; attempt++) {
      let code = '';
      for (let i = 0; i < this.length; i++) {
        code += RandomRoomCodeGenerator.ALPHABET[randomInt(RandomRoomCodeGenerator.ALPHABET.length)];
      }
      if (!isTaken(code)) return code;
    }
    throw new Error('Could not allocate a free room code');
  }
}
