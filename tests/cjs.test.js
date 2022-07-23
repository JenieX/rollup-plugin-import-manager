import test from "ava";
import { rollup } from "rollup";
import { importManager } from "../src/index.js";
import { DebuggingError } from "../src/errors.js";


test("selecting unit by module name", async (t) => {
    
    const debug = await t.throwsAsync(() => {
        return rollup({
            input: "./tests/fixtures/hi.cjs.cjs",
            plugins: [
                importManager({
                    units: {
                        file: "**/hi.cjs.cjs",
                        module: "hello",
                        actions: "debug"
                    }
                })
            ]
        }); 
    }, { instanceOf: DebuggingError });

    const unit = JSON.parse(debug.message);
    t.is(unit.module.name, "hello.cjs");
});


test("selecting unit by hash", async (t) => {
    
    const debug = await t.throwsAsync(() => {
        return rollup({
            input: "./tests/fixtures/hi.cjs.cjs",
            plugins: [
                importManager({
                    units: {
                        file: "**/hi.cjs.cjs",
                        hash: 2177228089,
                        actions: "debug"
                    }
                })
            ]
        }); 
    }, { instanceOf: DebuggingError });

    const unit = JSON.parse(debug.message);
    t.is(unit.module.name, "hello.cjs");
});


test("selecting unit by id", async (t) => {
    
    const debug = await t.throwsAsync(() => {
        return rollup({
            input: "./tests/fixtures/hi.cjs.cjs",
            plugins: [
                importManager({
                    warnings: false,
                    units: {
                        file: "**/hi.cjs.cjs",
                        id: 3000,
                        actions: "debug"
                    }
                })
            ]
        }); 

    }, { instanceOf: DebuggingError });

    const unit = JSON.parse(debug.message);
    t.is(unit.module.name, "hello.cjs");
});


test("removing import statement", async (t) => {
    
    const bundle = await rollup({
        input: "./tests/fixtures/hi.dynamic.js",
        plugins: [
            importManager({
                units: {
                    file: "**/hi.dynamic.js",
                    module: "hello",
                    actions: "remove"
                }
            })
        ]
    });

    t.truthy(bundle.watchFiles.length === 1);
});


test("changing a module (renaming)", async (t) => {
    
    const bundle = await rollup({
        input: "./tests/fixtures/hi.dynamic.js",
        plugins: [
            importManager({
                units: {
                    file: "**/hi.dynamic.js",
                    module: "hello",
                    actions: {
                        select: "module",
                        rename: "./lib/hello-clone.js"
                    }
                }
            })
        ]
    });
     
    const modPath = Boolean(
        bundle.watchFiles.filter(f => f.indexOf("hello-clone.js") > -1).at(0)
    );

    t.truthy(modPath);
});


test("creating an import statement", async (t) => {
    
    const bundle = await rollup({
        input: "./tests/fixtures/hi.dynamic.js",
        plugins: [
            importManager({
                units: {
                    file: "**/hi.dynamic.js",
                    createModule: "./lib/create.js",
                    type: "dynamic",
                    const: "create"
                }
            })
        ]
    });

    const code = bundle.cache.modules.at(0).code;
    const node = bundle
        .cache.modules.at(0).ast    // parse tree
        .body.at(0);                // first import statement
    

    const importStatement = code.slice(node.start, node.end);
    t.is(
        importStatement,
        "const create = await import(\"./lib/create.js\");"
    );
});


test("appending an import statement after a specific module", async (t) => {
    
    const bundle = await rollup({
        input: "./tests/fixtures/hi.dynamic.js",
        plugins: [
            importManager({
                units: {
                    file: "**/hi.dynamic.js",
                    createModule: "./lib/create.js",
                    type: "dynamic",
                    let: "create",
                    append: {
                        module: "hello"
                    }
                }
            })
        ]
    });

    const code = bundle.cache.modules.at(0).code;
    const node = bundle
        .cache.modules.at(0).ast    // parse tree
        .body.at(1);                // second import statement
    

    const importStatement = code.slice(node.start, node.end);
    t.is(
        importStatement,
        "let create = await import(\"./lib/create.js\");"
    );
});


test("prepending a manual created statement before a specific module, selected via hash", async (t) => {
    
    const bundle = await rollup({
        input: "./tests/fixtures/hi.dynamic.js",
        plugins: [
            importManager({
                units: {
                    file: "**/hi.dynamic.js",
                    addCode: "let create;\nimport(\"./lib/create.js\").then(i => create = i);\n",
                    prepend: {
                        hash: 119470642
                    }
                }
            })
        ]
    });

    const code = bundle.cache.modules.at(0).code;
    const astBody = bundle.cache.modules.at(0).ast.body;

    const nodeDecl = astBody.at(0);    
    const nodeStatement = astBody.at(1);

    const varDeclaration = code.slice(nodeDecl.start, nodeDecl.end);
    const importStatement = code.slice(nodeStatement.start, nodeStatement.end);

    t.is(
        varDeclaration,
        "let create;"
    );

    t.is(
        importStatement,
        "import(\"./lib/create.js\").then(i => create = i);"
    );
});
