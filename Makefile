.PHONY: generate

generate: plugin.wasm examples/sqlc.dev.yaml
	cd examples && sqlc -f sqlc.dev.yaml generate

plugin.wasm: out.js
	./javy build -C source-compression=y out.js -o plugin.wasm

out.js: src/app.ts $(wildcard src/drivers/*.ts) src/gen/plugin/codegen_pb.ts
	bun build --entrypoints ./src/app.ts --outfile=out.js --minify --target browser

src/gen/plugin/codegen_pb.ts: buf.gen.yaml
	buf generate --template buf.gen.yaml buf.build/sqlc/sqlc --path plugin/
