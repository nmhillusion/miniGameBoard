const { BullEngine } = require("@nmhillusion/n2ngin-bull-engine");

const engine = new BullEngine();
engine.config({
    rootDir: __dirname + "/src",
    outDir: __dirname + "/dist",
    pug: { enabled: true },
    markdown: { enabled: false },
    scss: { enabled: true },
    typescript: { enabled: true },
    copyResource: {
        enabled: true,
        config: {
            extsToCopy: [".jpg", ".jpeg", ".png", ".gif", ".ico", ".svg", ".woff", ".woff2", ".ttf", ".eot", ".mp3"]
        }
    },
    rewriteJavascript: { enabled: true, config: { rewriteImport: true } }
});

engine.render().then(() => {
    console.log("Built successfully");
}).catch(err => {
    console.error("Build failed:", err);
    process.exit(1);
});
