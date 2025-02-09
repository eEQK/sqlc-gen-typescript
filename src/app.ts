// I cant' get this import to work locally. The import in node_modules is
// javy/dist but esbuild requires the import to be javy/fs
//
// @ts-expect-error
import { STDIO, readFileSync, writeFileSync } from "javy/fs";
import ts, {
	EmitHint,
	NewLineKind,
	type Node,
	NodeFlags,
	ScriptKind,
	ScriptTarget,
	type Statement,
	SyntaxKind,
	type TypeNode,
	createPrinter,
	createSourceFile,
	factory,
	addSyntheticLeadingComment,
} from "typescript";

import {
	type Column,
	File,
	GenerateRequest,
	GenerateResponse,
	type Parameter,
	type Query,
} from "./gen/plugin/codegen_pb";

import { Driver as PostgresDriver } from "./drivers/postgres";
import { argName, colName } from "./drivers/utlis";
import { singularize } from "inflected";

// Read input from stdin
const input = readInput();
// Call the function with the input
const result = codegen(input);
// Write the result to stdout
writeOutput(result);

interface Options {
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
		embeds: Map<string, Column[]>,
	) => Statement;
	oneDecl: (
		name: string,
		text: string,
		argIface: string | undefined,
		returnIface: string,
		params: Parameter[],
		columns: Column[],
		embeds: Map<string, Column[]>,
	) => Statement;
}

function createNodeGenerator(options: Options): Driver {
	switch (options.driver) {
		case "postgres": {
			return new PostgresDriver();
		}
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

			const embeds: Map<string, Column[]> = new Map();
			for (const column of query.columns) {
				const embedTable = column.embedTable;
				if (embedTable === undefined) {
					continue;
				}

				const catalog = input.catalog;
				if (!catalog) {
					throw new Error("catalog is required");
				}

				const schemaName = embedTable.schema
					? embedTable.schema
					: catalog.defaultSchema;
				const schema = catalog.schemas.find((s) => s.name === schemaName);
				if (!schema) {
					throw new Error(`schema ${schemaName} not found`);
				}

				const table = schema.tables.find(
					(t) => t.rel?.name === embedTable.name,
				);
				if (!table) {
					throw new Error(`table ${embedTable.name} not found`);
				}

				embeds.set(column.name, table.columns);
			}

			let argIface = undefined;
			let returnIface: string | undefined;
			if (query.params.length > 0) {
				argIface = `${nameWithoutFileNs}Args`;
				nodesToPush.push(argsDecl(argIface, driver, query.params));
			}
			if (query.columns.length === 1) {
				const col = query.columns[0];
				returnIface = driver.parseDatabaseType(col.type?.name ?? "");
				addSyntheticLeadingComment(
					nodesToPush.slice(-1)[0],
					SyntaxKind.MultiLineCommentTrivia,
					`${col.type.name}, ${col.arrayDims}: ${returnIface}`,
					true,
				);
				if (col.isArray || col.type?.name === "anyarray") {
					returnIface += "[]";
				}
			} else if (query.columns.length > 1) {
				returnIface = `${nameWithoutFileNs}Row`;
				nodesToPush.push(rowDecl(returnIface, driver, query.columns, embeds));
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
							embeds,
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
							embeds,
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
							ts.NodeFlags.Namespace,
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
					ts.NodeFlags.Namespace,
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

function rowDecl(
	name: string,
	driver: Driver,
	columns: Column[],
	embeds: Map<string, Column[]>,
) {
	return factory.createInterfaceDeclaration(
		[factory.createToken(SyntaxKind.ExportKeyword)],
		factory.createIdentifier(name),
		undefined,
		undefined,
		columns.map((column, i) => {
			const embed = embeds.get(column.name);
			if (!embed) {
				return factory.createPropertySignature(
					undefined,
					factory.createIdentifier(colName(i, column)),
					undefined,
					driver.createColumnTypeNode(column),
				);
			}

			return factory.createPropertySignature(
				undefined,
				factory.createIdentifier(singularize(column.name)),
				undefined,
				factory.createTypeLiteralNode(
					embed.map((column, j) =>
						factory.createPropertySignature(
							undefined,
							factory.createIdentifier(colName(i + j, column)),
							undefined,
							driver.createColumnTypeNode(column),
						),
					),
				),
			);
		}),
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
