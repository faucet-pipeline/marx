import path from "path";
import {promises as fs} from "fs";

export interface ResolveOptions {
    enforceRelative?: boolean;
}

function abort(msg: string): never {
    console.error(msg);
    process.exit(1);
}

function repr(value: unknown, jsonify = true): string {
    if (jsonify) {
        value = JSON.stringify(value);
    }
    return `\`${value}\``;
}

export function resolvePath(filepath: string, referenceDir: string, { enforceRelative }: ResolveOptions = {}): string {
    if(/^\.?\.\//.test(filepath)) { // starts with `./` or `../`
        return path.resolve(referenceDir, filepath);
    }
    else if (enforceRelative) {
        abort(`ERROR: path must be relative: ${repr(filepath)}`);
    }
    else { // attempt via Node resolution algorithm
        try {
            return require.resolve(filepath, { paths: [referenceDir] });
        }
        catch (err) {
            abort(`ERROR: could not resolve ${repr(filepath)}`);
        }
    }
}

export type KeyTransform = (k: string, targetDir?: string) => string;
export type ValueTransform = (v: string) => string;

export interface ManifestOptions {
    target?: string;
    key?: "short" | KeyTransform;
    value?: ValueTransform;
    baseURI?: string;
    webRoot?: string;
}

export interface ManifestData {
    uri: string;
    meta: Record<string, any>;
}

export class Manifest {

    public readonly webRoot: string;
    public readonly filepath?: string;
    public readonly keyTransform: KeyTransform;
    public readonly valueTransform: ValueTransform;

    private readonly _index = new Map<string, ManifestData>();

    constructor(referenceDir: string, { target, key, value, baseURI, webRoot }: ManifestOptions = {}) {
        if (value && (baseURI || webRoot))
            abort("ERROR: `value` must not be used with `baseURI` and/or `webRoot`");

        this.webRoot = resolvePath(webRoot || "./", referenceDir, { enforceRelative: true });

        if (target)
            this.filepath = resolvePath(target, referenceDir, { enforceRelative: true });

        if (key === "short")
            this.keyTransform = (fp, targetDir) => {
                if (!targetDir)
                    abort("ERROR: `short` requires a `targetDir`");
                return path.relative(targetDir, fp);
            }
        else
            this.keyTransform = key || (filepath => filepath);

        if (value) {
            this.valueTransform = value;
        }
        else {
            baseURI = baseURI || "/";
            this.valueTransform = filepath => baseURI + path.relative(this.webRoot, filepath);
        }
    }

    get(originalPath: string): string | undefined {
        const entry = this._index.get(originalPath);
        if (entry)
            return entry.uri;
        return undefined;
    }

    meta(originalPath: string): Record<string, any> | undefined {
        const entry = this._index.get(originalPath);
        if (entry)
            return entry.meta;
        return undefined;
    }

    set(originalPath: string, actualPath: string, targetDir?: string): Promise<void> {
        let key = this.keyTransform(originalPath, targetDir);
        let uri = this.valueTransform(actualPath);
        this._index.set(key, { uri: uri, meta: {} });

        let fp = this.filepath;
        return fp ? fs.writeFile(fp, JSON.stringify(this) + "\n") : Promise.resolve();
    }

    toJSON(): any {
        let index = this._index;
        return Array.from(index.keys()).sort().reduce((memo: Record<string, string>, key) => {
            memo[key] = index.get(key)!.uri;
            return memo;
        }, {});
    }

}