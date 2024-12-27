// I cant' get this import to work locally. The import in node_modules is
// javy/dist but esbuild requires the import to be javy/fs
//
// @ts-expect-error
import { readFileSync, writeFileSync, STDIO } from "javy/fs";
import {
	EmitHint,
	NewLineKind,
	type TypeNode,
	ScriptKind,
	ScriptTarget,
	SyntaxKind,
	type Node,
	NodeFlags,
	createPrinter,
	createSourceFile,
	factory,
	type Statement,
} from "typescript";

import {
	GenerateRequest,
	GenerateResponse,
	type Parameter,
	type Column,
	File,
	type Query,
} from "./gen/plugin/codegen_pb";

import { argName, colName } from "./drivers/utlis";
import { Driver as PostgresDriver } from "./drivers/postgres";

// Read input from stdin
const input = readInput();
// Call the function with the input
const result = codegen(input);
// Write the result to stdout
writeOutput(result);

interface Options {
	runtime?: string;
	driver?: string;
}

interface Driver {
	preamble: (queries: Query[]) => Statement[];
	parseDatabaseType(type: string): string;
	createColumnTypeNode(column?: Column): TypeNode;
	execDecl: (
		name: string,
		text: string,
		iface: string | undefined,
		params: Parameter[],
		namespace?: string,
	) => Statement;
	execlastidDecl: (
		name: string,
		text: string,
		iface: string | undefined,
		params: Parameter[],
		namespace?: string,
	) => Statement;
	manyDecl: (
		name: string,
		text: string,
		argIface: string | undefined,
		returnIface: string,
		params: Parameter[],
		columns: Column[],
		namespace?: string,
	) => Statement;
	oneDecl: (
		name: string,
		text: string,
		argIface: string | undefined,
		returnIface: string,
		params: Parameter[],
		columns: Column[],
		namespace?: string,
	) => Statement;
}

function createNodeGenerator(options: Options): Driver {
	switch (options.driver) {
		// case "mysql2": {
		// 	return new MysqlDriver(options.mysql2);
		// }
		// case "pg": {
		// 	return new PgDriver();
		// }
		case "postgres": {
			return new PostgresDriver();
		}
		// case "better-sqlite3": {
		// 	return new Sqlite3Driver();
		// }
	}
	throw new Error(`unknown driver: ${options.driver}`);
}

function codegen(input: GenerateRequest): GenerateResponse {
	const files = [];
	let options: Options = {};

	if (input.pluginOptions.length > 0) {
		const text = new TextDecoder().decode(input.pluginOptions);
		options = JSON.parse(text) as Options;
	}

	const driver = createNodeGenerator(options);

	// TODO: Verify options, parse them from protobuf honestly

	const querymap = new Map<string, Query[]>();

	for (const query of input.queries) {
		if (!querymap.has(query.filename)) {
			querymap.set(query.filename, []);
		}
		const qs = querymap.get(query.filename);
		qs?.push(query);
	}

	for (const [filename, queries] of querymap.entries()) {
		const fileNs = queries[0].comments
			.find((c) => c.startsWith("@namespace"))
			?.split(" ")
			?.pop();

		let nodes: Statement[] = [];

		for (const query of queries) {
			const colmap = new Map<string, number>();
			for (const column of query.columns) {
				if (!column.name) {
					continue;
				}
				const count = colmap.get(column.name) || 0;
				if (count > 0) {
					column.name = `${column.name}_${count + 1}`;
				}
				colmap.set(column.name, count + 1);
			}

			const name = fileNs ? query.name.replace(`${fileNs}_`, "") : query.name;
			const [queryNs, nameWithoutFileNs] =
				name.indexOf("_") > -1 ? name.split("_") : [undefined, name];
			const lowerName =
				nameWithoutFileNs[0].toLowerCase() + nameWithoutFileNs.slice(1);
			const textName = `${lowerName}Query`;

			const nodesToPush: Statement[] = [];

			nodesToPush.push(
				queryDecl(
					textName,
					`-- name: ${query.name} ${query.cmd}
${query.text.trim()}`,
				),
			);

			let argIface = undefined;
			let returnIface = undefined;
			if (query.params.length > 0) {
				argIface = `${nameWithoutFileNs}Args`;
				nodesToPush.push(argsDecl(argIface, driver, query.params));
			}
			if (query.columns.length === 1) {
				returnIface = driver.parseDatabaseType(
					query.columns[0].type?.name ?? "",
				);
			} else if (query.columns.length > 1) {
				returnIface = `${nameWithoutFileNs}Row`;
				nodesToPush.push(rowDecl(returnIface, driver, query.columns));
			}

			switch (query.cmd) {
				case ":exec": {
					nodesToPush.push(
						driver.execDecl(
							lowerName,
							textName,
							argIface,
							query.params,
							queryNs,
						),
					);
					break;
				}
				case ":execlastid": {
					nodesToPush.push(
						driver.execlastidDecl(
							lowerName,
							textName,
							argIface,
							query.params,
							queryNs,
						),
					);
					break;
				}
				case ":one": {
					nodesToPush.push(
						driver.oneDecl(
							lowerName,
							textName,
							argIface,
							returnIface ?? "void",
							query.params,
							query.columns,
							queryNs,
						),
					);
					break;
				}
				case ":many": {
					nodesToPush.push(
						driver.manyDecl(
							lowerName,
							textName,
							argIface,
							returnIface ?? "void",
							query.params,
							query.columns,
							queryNs,
						),
					);
					break;
				}
			}
			if (nodesToPush) {
				if (queryNs) {
					nodes.push(
						factory.createModuleDeclaration(
							[factory.createToken(SyntaxKind.ExportKeyword)],
							factory.createIdentifier(queryNs),
							factory.createModuleBlock(nodesToPush),
						),
					);
				} else {
					nodes.push(...nodesToPush);
				}
			}
		}

		if (fileNs) {
			nodes = [
				factory.createModuleDeclaration(
					[factory.createToken(SyntaxKind.ExportKeyword)],
					factory.createIdentifier(fileNs),
					factory.createModuleBlock(nodes),
				),
			];
		}

		nodes.unshift(...driver.preamble(queries));

		files.push(
			new File({
				name: `${filename.replace(".", "_")}.ts`,
				contents: new TextEncoder().encode(printNode(nodes)),
			}),
		);
	}

	return new GenerateResponse({
		files: files,
	});
}

// Read input from stdin
function readInput(): GenerateRequest {
	const buffer = readFileSync(STDIO.Stdin);
	return GenerateRequest.fromBinary(buffer);
}

function queryDecl(name: string, sql: string) {
	return factory.createVariableStatement(
		[],
		factory.createVariableDeclarationList(
			[
				factory.createVariableDeclaration(
					factory.createIdentifier(name),
					undefined,
					undefined,
					factory.createNoSubstitutionTemplateLiteral(sql, sql),
				),
			],
			NodeFlags.Const, //| NodeFlags.Constant | NodeFlags.Constant
		),
	);
}

function argsDecl(name: string, driver: Driver, params: Parameter[]) {
	return factory.createInterfaceDeclaration(
		[factory.createToken(SyntaxKind.ExportKeyword)],
		factory.createIdentifier(name),
		undefined,
		undefined,
		params.map((param, i) =>
			factory.createPropertySignature(
				undefined,
				factory.createIdentifier(argName(i, param.column)),
				undefined,
				driver.createColumnTypeNode(param.column),
			),
		),
	);
}

function rowDecl(name: string, driver: Driver, columns: Column[]) {
	return factory.createInterfaceDeclaration(
		[factory.createToken(SyntaxKind.ExportKeyword)],
		factory.createIdentifier(name),
		undefined,
		undefined,
		columns.map((column, i) =>
			factory.createPropertySignature(
				undefined,
				factory.createIdentifier(colName(i, column)),
				undefined,
				driver.createColumnTypeNode(column),
			),
		),
	);
}

function printNode(nodes: Node[]): string {
	// https://github.com/microsoft/TypeScript/wiki/Using-the-Compiler-API#creating-and-printing-a-typescript-ast
	const resultFile = createSourceFile(
		"file.ts",
		"",
		ScriptTarget.Latest,
		/*setParentNodes*/ false,
		ScriptKind.TS,
	);
	const printer = createPrinter({ newLine: NewLineKind.LineFeed });
	let output = "// Code generated by sqlc. DO NOT EDIT.\n\n";
	for (const node of nodes) {
		output += printer.printNode(EmitHint.Unspecified, node, resultFile);
		output += "\n\n";
	}
	return output;
}

// Write output to stdout
function writeOutput(output: GenerateResponse) {
	const encodedOutput = output.toBinary();
	const buffer = new Uint8Array(encodedOutput);
	writeFileSync(STDIO.Stdout, buffer);
}
