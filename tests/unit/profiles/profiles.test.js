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

    it('should return default-equivalent command set for bematech-mp4200th', () => {
      const cmds = getCommandsForProfile(bematechMp4200thProfile);
      const { commands } = require('../../../dist/printer/commands');
      expect(cmds.ESC).toEqual(commands.ESC);
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
  });
});
