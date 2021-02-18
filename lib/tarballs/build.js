"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const findYarnWorkspaceRoot = require("find-yarn-workspace-root");
const path = require("path");
const qq = require("qqjs");
const log_1 = require("../log");
const bin_1 = require("./bin");
const node_1 = require("./node");
const upload_util_1 = require("../upload-util");
const pack = async (from, to) => {
    const prevCwd = qq.cwd();
    qq.cd(path.dirname(from));
    await qq.mkdirp(path.dirname(to));
    log_1.log(`packing tarball from ${qq.prettifyPaths(from)} to ${qq.prettifyPaths(to)}`);
    await (to.endsWith('gz') ?
        qq.x('tar', ['czf', to, path.basename(from)]) :
        qq.x(`tar c ${path.basename(from)} | xz > ${to}`));
    qq.cd(prevCwd);
};
async function build(c, options = {}) {
    const { xz, config } = c;
    const prevCwd = qq.cwd();
    const packCLI = async () => {
        const stdout = await qq.x.stdout('npm', ['pack', '--unsafe-perm'], { cwd: c.root });
        return path.join(c.root, stdout.split('\n').pop());
    };
    const extractCLI = async (tarball) => {
        await qq.emptyDir(c.workspace());
        await qq.mv(tarball, c.workspace());
        tarball = path.basename(tarball);
        tarball = qq.join([c.workspace(), tarball]);
        qq.cd(c.workspace());
        await qq.x(`tar -xzf ${tarball}`);
        // eslint-disable-next-line no-await-in-loop
        for (const f of await qq.ls('package', { fullpath: true }))
            await qq.mv(f, '.');
        await qq.rm('package', tarball, 'bin/run.cmd');
    };
    const updatePJSON = async () => {
        qq.cd(c.workspace());
        const pjson = await qq.readJSON('package.json');
        pjson.version = c.version;
        pjson.oclif.update = pjson.oclif.update || {};
        pjson.oclif.update.s3 = pjson.oclif.update.s3 || {};
        pjson.oclif.update.s3.bucket = c.s3Config.bucket;
        await qq.writeJSON('package.json', pjson);
    };
    const addDependencies = async () => {
        qq.cd(c.workspace());
        const yarnRoot = findYarnWorkspaceRoot(c.root) || c.root;
        const yarn = await qq.exists([yarnRoot, 'yarn.lock']);
        if (yarn) {
            await qq.cp([yarnRoot, 'yarn.lock'], '.');
            await qq.x('yarn --no-progress --production --non-interactive');
        }
        else {
            let lockpath = qq.join(c.root, 'package-lock.json');
            if (!await qq.exists(lockpath)) {
                lockpath = qq.join(c.root, 'npm-shrinkwrap.json');
            }
            await qq.cp(lockpath, '.');
            await qq.x('npm install --production');
        }
    };
    const buildTarget = async (target) => {
        const workspace = c.workspace(target);
        const gzLocalKey = upload_util_1.templateShortKey('versioned', '.tar.gz', {
            arch: target.arch,
            bin: c.config.bin,
            platform: target.platform,
            sha: c.gitSha,
            version: config.version,
        });
        const xzLocalKey = upload_util_1.templateShortKey('versioned', '.tar.xz', {
            arch: target.arch,
            bin: c.config.bin,
            platform: target.platform,
            sha: c.gitSha,
            version: config.version,
        });
        const base = path.basename(gzLocalKey);
        log_1.log(`building target ${base}`);
        log_1.log('copying workspace', c.workspace(), workspace);
        await qq.rm(workspace);
        await qq.cp(c.workspace(), workspace);
        await node_1.fetchNodeBinary({
            nodeVersion: c.nodeVersion,
            output: path.join(workspace, 'bin', 'node'),
            platform: target.platform,
            arch: target.arch,
            tmp: qq.join(config.root, 'tmp'),
        });
        if (options.pack === false)
            return;
        await pack(workspace, c.dist(gzLocalKey));
        if (xz)
            await pack(workspace, c.dist(xzLocalKey));
        if (!c.updateConfig.s3.host)
            return;
        const rollout = (typeof c.updateConfig.autoupdate === 'object' && c.updateConfig.autoupdate.rollout);
        const gzCloudKey = `${upload_util_1.commitAWSDir(c.version, c.gitSha, c.updateConfig.s3)}/${gzLocalKey}`;
        const xzCloudKey = `${upload_util_1.commitAWSDir(c.version, c.gitSha, c.updateConfig.s3)}/${xzLocalKey}`;
        const manifest = {
            rollout: rollout === false ? undefined : rollout,
            version: c.version,
            sha: c.gitSha,
            baseDir: upload_util_1.templateShortKey('baseDir', target, { bin: c.config.bin }),
            gz: config.s3Url(gzCloudKey),
            xz: xz ? config.s3Url(xzCloudKey) : undefined,
            sha256gz: await qq.hash('sha256', c.dist(gzLocalKey)),
            sha256xz: xz ? await qq.hash('sha256', c.dist(xzLocalKey)) : undefined,
            node: {
                compatible: config.pjson.engines.node,
                recommended: c.nodeVersion,
            },
        };
        const manifestFilepath = c.dist(upload_util_1.templateShortKey('manifest', {
            arch: target.arch,
            bin: c.config.bin,
            platform: target.platform,
            sha: c.gitSha,
            version: config.version,
        }));
        await qq.writeJSON(manifestFilepath, manifest);
    };
    log_1.log(`gathering workspace for ${config.bin} to ${c.workspace()}`);
    await extractCLI(await packCLI());
    await updatePJSON();
    await addDependencies();
    await bin_1.writeBinScripts({ config, baseWorkspace: c.workspace(), nodeVersion: c.nodeVersion });
    for (const target of c.targets) {
        if (!options.platform || options.platform === target.platform) {
            // eslint-disable-next-line no-await-in-loop
            await buildTarget(target);
        }
    }
    qq.cd(prevCwd);
}
exports.build = build;
