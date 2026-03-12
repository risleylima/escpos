import { Adapter } from './adapter';
import { Serial } from './serial-adapter';
import { USB } from './usb-adapter';
import { Network } from './network-adapter';
import { Printer } from './printer';
import { Image } from './printer/image';

export { Adapter, Serial, USB, Network, Printer, Image };
export type { AdapterLike } from './adapter';
export type { NetworkConnectOptions } from './network-adapter';
export type { PrinterOptions, RowColumn, LineItemOptions, TotalOptions, PresentTicketOptions } from './printer';
export type { PixelsObject, ImageProcessingOptions } from './printer/image';
export {
  getProfile,
  registerProfile,
  createProfileRegistry,
  getCommandsForProfile,
  listProfiles,
  defaultProfile,
  customVkp80iiiProfile,
  bematechMp4200thProfile,
} from './printer/profiles';
export type {
  PrinterProfile,
  CommandSet,
  CommandSetOverride,
  PaperWidthCommandFn,
  TicketPresentationOptions,
  BarcodeOptions,
  QrCodeOptions,
  BarcodeBuildContext,
  QrCodeBuildContext,
  Vkp80iiiTicketPresentationOptions,
  ProfileRegistry,
} from './printer/profiles';
