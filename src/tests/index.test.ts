import path from "path";
import Manifest from "..";

describe("manifest", () => {
    it("maps original to actual file names with deterministic serialization", async () => {
        let manifest = new Manifest(path.resolve(__dirname, "..", ".."));

        await manifest.set("foo.png", "foo-abc123.png");

        expect(JSON.stringify(manifest)).toBe('{"foo.png":"/foo-abc123.png"}');

        await manifest.set("bar.css", "bar-def456.css");

        expect(JSON.stringify(manifest)).toBe('{"bar.css":"/bar-def456.css","foo.png":"/foo-abc123.png"}');

        await manifest.set("xox.js", "xox-ghi789.js");

        expect(JSON.stringify(manifest)).toBe('{"bar.css":"/bar-def456.css","foo.png":"/foo-abc123.png","xox.js":"/xox-ghi789.js"}');
    });
});