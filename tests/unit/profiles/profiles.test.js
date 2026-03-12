'use strict';

const {
  getProfile,
  listProfiles,
  registerProfile,
  getCommandsForProfile,
  defaultProfile,
  customVkp80iiiProfile,
} = require('../../../dist/printer/profiles');
const { bematechMp4200thProfile } = require('../../../dist/printer/profiles/bematech/mp4200th');

describe('Printer profiles', () => {
  describe('getProfile', () => {
    it('should return default profile by id', () => {
      const p = getProfile('default');
      expect(p).toBeDefined();
      expect(p.id).toBe('default');
      expect(p.name).toBe('ESC/POS Standard');
    });

    it('should return custom-vkp80iii profile by id', () => {
      const p = getProfile('custom-vkp80iii');
      expect(p).toBeDefined();
      expect(p.id).toBe('custom-vkp80iii');
      expect(p.name).toBe('CUSTOM VKP80III');
    });

    it('should return bematech-mp4200th profile by id', () => {
      const p = getProfile('bematech-mp4200th');
      expect(p).toBeDefined();
      expect(p.id).toBe('bematech-mp4200th');
      expect(p.name).toBe('Bematech MP-4200 TH');
      // Corrected industrial width
      expect(p.defaultPaperWidth).toBe(48);
      expect(Array.isArray(p.paperWidths)).toBe(true);
      expect(p.paperWidths).toContain(48);
      expect(p.codepages.utf8).toBeUndefined();
      expect(p.qrCodeStrategy).toBe('auto');
      expect(p.supportsNativeQrCode).toBe(false);
    });

    it('should return undefined for unknown profile id', () => {
      const p = getProfile('non-existent');
      expect(p).toBeUndefined();
    });
  });

  describe('listProfiles', () => {
    it('should return array of registered profiles with id and name', () => {
      const list = listProfiles();
      expect(Array.isArray(list)).toBe(true);
      expect(list.length).toBeGreaterThanOrEqual(3);
      const ids = list.map(p => p.id);
      expect(ids).toContain('default');
      expect(ids).toContain('custom-vkp80iii');
      expect(ids).toContain('bematech-mp4200th');
    });
  });

  describe('registerProfile', () => {
    it('should register a new profile and allow lookup (using structure match)', () => {
      const myProfile = { id: 'test-p', name: 'Test Profile' };
      registerProfile(myProfile);
      // Profile is cloned on registration, so check equality, not identity
      expect(getProfile('test-p')).toMatchObject(myProfile);
    });

    it('should throw for invalid profile payload', () => {
      expect(() => registerProfile({ name: 'No ID' })).toThrow(/id/);
      expect(() => registerProfile({ id: 'No Name' })).toThrow(/name/);
    });

    it('should throw when registering duplicate id without overwrite', () => {
      registerProfile({ id: 'dup', name: 'First' });
      // The real error message contains "is already registered"
      expect(() => registerProfile({ id: 'dup', name: 'Second' })).toThrow(/already registered/);
    });

    it('should allow overwrite when explicitly requested', () => {
      registerProfile({ id: 'overwrite-me', name: 'Old' });
      const newP = { id: 'overwrite-me', name: 'New' };
      // Passing overwrite: true in the second argument options object
      registerProfile(newP, { overwrite: true });
      expect(getProfile('overwrite-me')).toMatchObject(newP);
    });
  });

  describe('getCommandsForProfile', () => {
    it('should return default command set for default profile', () => {
      const cmds = getCommandsForProfile(defaultProfile);
      const { commands } = require('../../../dist/printer/commands');
      expect(cmds.ESC).toEqual(commands.ESC);
      expect(cmds.GS).toEqual(commands.GS);
    });

    it('should return merged command set for custom-vkp80iii (PAPER overrides)', () => {
      const cmds = getCommandsForProfile(customVkp80iiiProfile);
      expect(cmds.PAPER.PAPER_FULL_CUT).toEqual(Buffer.from('1D5600', 'hex'));
      const { commands } = require('../../../dist/printer/commands');
      expect(cmds.ESC).toEqual(commands.ESC);
    });

    it('should return merged command set for bematech-mp4200th overrides', () => {
      const cmds = getCommandsForProfile(bematechMp4200thProfile);
      const { commands } = require('../../../dist/printer/commands');
      expect(cmds.ESC).toEqual(commands.ESC);
      expect(cmds.TEXT_FORMAT.TXT_FONT_C).toEqual(Buffer.from('1B4D00', 'hex'));
      expect(cmds.BARCODE_FORMAT.BARCODE_WIDTH_DEFAULT).toEqual(Buffer.from('1D7703', 'hex'));
      expect(cmds.BARCODE_FORMAT.BARCODE_HEIGHT_DEFAULT).toEqual(Buffer.from('1D68C0', 'hex'));
    });

    it('should keep default commands for keys not overridden in custom profile', () => {
      const profile = { id: 'p', name: 'P', commandsOverride: { ESC: Buffer.from([0x00]) } };
      const cmds = getCommandsForProfile(profile);
      expect(cmds.ESC).toEqual(Buffer.from([0x00]));
      const { commands } = require('../../../dist/printer/commands');
      expect(cmds.GS).toEqual(commands.GS);
    });
  });

  describe('ticket presentation builder', () => {
    it('should build FS P command with defaults for custom-vkp80iii', () => {
      const p = customVkp80iiiProfile;
      const cmd = p.getTicketPresentationCommand();
      expect(cmd).toEqual(Buffer.from('1C501401450A', 'hex'));
    });

    it('should build FS P command with provided params', () => {
      const p = customVkp80iiiProfile;
      const cmd = p.getTicketPresentationCommand({ paramA: 0x01, paramB: 0x02, paramC: 0x03, paramD: 0x04 });
      expect(cmd).toEqual(Buffer.from('1C5001020304', 'hex'));
    });

    it('should validate VKP80III ticket presentation params', () => {
      const p = customVkp80iiiProfile;
      expect(() => p.validateTicketPresentationOptions({ paramA: -1 })).toThrow();
      expect(() => p.validateTicketPresentationOptions({ paramA: 256 })).toThrow();
      expect(() => p.validateTicketPresentationOptions({ paramA: 'not-a-number' })).toThrow();
    });

    it('should provide profile-specific recover command for custom-vkp80iii', () => {
      const cmds = getCommandsForProfile(customVkp80iiiProfile);
      const buf = customVkp80iiiProfile.buildRecoverCommand({
        commands: cmds,
      });
      expect(Buffer.isBuffer(buf)).toBe(true);
      const hex = buf.toString('hex').toLowerCase();
      expect(hex).toContain('1b40'); // ESC @
      expect(hex).toContain('1b6100'); // align left
      expect(hex).toContain('1b32'); // line spacing default
      expect(hex).toContain('1b4d00'); // font A
      expect(hex).not.toContain('1c50'); // no ticket presentation in recover
    });
  });

  describe('bematech profile hooks', () => {
    it('should expose conservative qr defaults for bematech-mp4200th', () => {
      expect(bematechMp4200thProfile.qrCodeStrategy).toBe('auto');
      expect(bematechMp4200thProfile.supportsNativeQrCode).toBe(false);
    });

    it('should provide profile-specific PDF417 code2d builder', () => {
      const cmds = getCommandsForProfile(bematechMp4200thProfile);
      const buf = bematechMp4200thProfile.buildCode2d('ABC123', 'PDF417', undefined, {
        commands: cmds,
      });
      expect(Buffer.isBuffer(buf)).toBe(true);
      const hex = buf.toString('hex').toLowerCase();
      expect(hex).toContain('1d286b0300304100'); // fn=65
      expect(hex).toContain('1d286b0300305130'); // fn=81 print
    });

    it('should reject profile-specific code2d QR in bematech', () => {
      const cmds = getCommandsForProfile(bematechMp4200thProfile);
      expect(() =>
        bematechMp4200thProfile.buildCode2d('ABC123', 'QR', 'M', {
          commands: cmds,
        })
      ).toThrow(/use qrcode/i);
    });

    it('should provide profile-specific recover command for bematech', () => {
      const cmds = getCommandsForProfile(bematechMp4200thProfile);
      const buf = bematechMp4200thProfile.buildRecoverCommand({
        commands: cmds,
      });
      expect(Buffer.isBuffer(buf)).toBe(true);
      const hex = buf.toString('hex').toLowerCase();
      expect(hex).toContain('1b40'); // ESC @
      expect(hex).toContain('1b6100'); // align left
      expect(hex).toContain('1b32'); // line spacing default
      expect(hex).toContain('1b4d00'); // font A
    });
  });
});
