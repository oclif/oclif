import * as Config from '@oclif/config';
import { BuildConfig as TarballConfig } from './tarballs/config';
export declare function commitAWSDir(version: string, sha: string, s3Config: TarballConfig['s3Config']): string;
export declare function channelAWSDir(channel: string, s3Config: TarballConfig['s3Config']): string;
export declare function templateShortKey(type: keyof Config.PJSON.S3.Templates | 'macos' | 'win32' | 'deb', ext?: '.tar.gz' | '.tar.xz' | Config.IConfig.s3Key.Options, options?: Config.IConfig.s3Key.Options): string;
export declare function debArch(arch: Config.ArchTypes): "amd64" | "i386" | "armel";
export declare function debVersion(buildConfig: TarballConfig): string;
