export declare function fetchNodeBinary({ nodeVersion, output, platform, arch, tmp }: {
    nodeVersion: string;
    output: string;
    platform: string;
    arch: string;
    tmp: string;
}): Promise<string>;
