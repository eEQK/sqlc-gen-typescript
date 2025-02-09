import {
	type Expression,
	type ExpressionStatement,
	type FunctionDeclaration,
	NodeFlags,
	SyntaxKind,
	type TypeNode,
	factory,
} from "typescript";

import type { Column, Parameter } from "../gen/plugin/codegen_pb";
import { argName, colName } from "./utlis";
import { singularize } from "inflected";

const typeMapping = {
	string: [
		// resolve this to string as a special case
		"unknown",

		"aclitem",
		"bit",
		"box",
		"citext",
		"bpchar",
		"cid",
		"cidr",
		"circle",
		"inet",
		"interval",
		"line",
		"lseg",
		"macaddr",
		"macaddr8",
		"money",
		"path",
		"pg_node_tree",
		"pg_snapshot",
		"point",
		"polygon",
		"regproc",
		"regrole",
		"smallserial",
		"tid",
		"text",
		"time",
		"timetz",
		"tsquery",
		"tsvector",
		"txid_snapshot",
		"uuid",
		"varbit",
		"varchar",
		"xid",
		"xml",
	],
	number: [
		"bigint",
		"bigserial",
		"smallserial",
		"double precision",
		"real",
		"decimal",
		"integer",
		"smallint",
		"int2",
		"int4",
		"int8",
		"float4",
		"float8",
		"serial",
		"serial2",
		"serial4",
		"serial8",
		"oid",
	],
	Date: ["date", "timestamp", "timestamptz"],
	Buffer: ["bytea"],
	boolean: ["bool"],
	any: ["json", "jsonb"],
};

function funcParamsDecl(iface: string | undefined, params: Parameter[]) {
	const funcParams = [
		factory.createParameterDeclaration(
			undefined,
			undefined,
			factory.createIdentifier("sql"),
			undefined,
			factory.createTypeReferenceNode(
				factory.createIdentifier("Sql"),
				undefined,
			),
			undefined,
		),
	];

	if (iface && params.length > 0) {
		funcParams.push(
			factory.createParameterDeclaration(
				undefined,
				undefined,
				factory.createIdentifier("args"),
				undefined,
				factory.createTypeReferenceNode(
					factory.createIdentifier(iface),
					undefined,
				),
				undefined,
			),
		);
	}

	return funcParams;
}

type KeyOf<T> = T extends Record<infer K, unknown> ? K : never;
type Types = KeyOf<typeof typeMapping>;

export class Driver {
	parseDatabaseType(type: string): Types {
		for (const [key, value] of Object.entries(typeMapping)) {
			if (value.includes(type)) {
				return key as Types;
			}
		}

		return "string";
	}

	createColumnTypeNode(column?: Column): TypeNode {
		if (column === undefined || column.type === undefined) {
			return factory.createKeywordTypeNode(SyntaxKind.AnyKeyword);
		}
		// Some of the type names have the `pgcatalog.` prefix. Remove this.
		let pgType = column.type.name;
		const pgCatalog = "pg_catalog.";
		if (pgType.startsWith(pgCatalog)) {
			pgType = pgType.slice(pgCatalog.length);
		}
		const type = this.parseDatabaseType(pgType);

		let keyword: TypeNode;
		if (type === "string") {
			keyword = factory.createKeywordTypeNode(SyntaxKind.StringKeyword);
		} else if (type === "number") {
			keyword = factory.createKeywordTypeNode(SyntaxKind.NumberKeyword);
		} else if (type === "boolean") {
			keyword = factory.createKeywordTypeNode(SyntaxKind.BooleanKeyword);
		} else if (type === "Date") {
			keyword = factory.createTypeReferenceNode(
				factory.createIdentifier("Date"),
				undefined,
			);
		} else if (type === "Buffer") {
			keyword = factory.createTypeReferenceNode(
				factory.createIdentifier("Buffer"),
				undefined,
			);
		} else if (type === "any") {
			keyword = factory.createKeywordTypeNode(SyntaxKind.AnyKeyword);
		} else {
			keyword = factory.createKeywordTypeNode(SyntaxKind.StringKeyword);
		}

		if (
			column.type?.name === "anyarray" ||
			column.isArray ||
			column.arrayDims > 0
		) {
			const dims = Math.max(column.arrayDims || 1);
			for (let i = 0; i < dims; i++) {
				keyword = factory.createArrayTypeNode(keyword);
			}
		}
		if (column.notNull) {
			return keyword;
		}
		return factory.createUnionTypeNode([
			keyword,
			factory.createLiteralTypeNode(factory.createNull()),
		]);
	}

	preamble(queries: unknown) {
		return [
			factory.createImportDeclaration(
				undefined,
				factory.createImportClause(
					true,
					undefined,
					factory.createNamedImports([
						factory.createImportSpecifier(
							false,
							undefined,
							factory.createIdentifier("Sql"),
						),
					]),
				),
				factory.createStringLiteral("postgres"),
				undefined,
			),
		];
	}

	execDecl(
		funcName: string,
		queryName: string,
		argIface: string | undefined,
		params: Parameter[],
	) {
		const funcParams = funcParamsDecl(argIface, params);

		return factory.createFunctionDeclaration(
			[
				factory.createToken(SyntaxKind.ExportKeyword),
				factory.createToken(SyntaxKind.AsyncKeyword),
			],
			undefined,
			factory.createIdentifier(funcName),
			undefined,
			funcParams,
			factory.createTypeReferenceNode(factory.createIdentifier("Promise"), [
				factory.createKeywordTypeNode(SyntaxKind.VoidKeyword),
			]),
			factory.createBlock(
				[
					factory.createExpressionStatement(
						factory.createAwaitExpression(
							factory.createCallExpression(
								factory.createPropertyAccessExpression(
									factory.createIdentifier("sql"),
									factory.createIdentifier("unsafe"),
								),
								undefined,
								[
									factory.createIdentifier(queryName),
									factory.createArrayLiteralExpression(
										params.map((param, i) =>
											factory.createPropertyAccessExpression(
												factory.createIdentifier("args"),
												factory.createIdentifier(argName(i, param.column)),
											),
										),
										false,
									),
								],
							),
						),
					),
				],
				true,
			),
		);
	}

	manyDecl(
		funcName: string,
		queryName: string,
		argIface: string | undefined,
		returnIface: string,
		params: Parameter[],
		columns: Column[],
		embeds: Map<string, Column[]>,
	) {
		const funcParams = funcParamsDecl(argIface, params);

		return factory.createFunctionDeclaration(
			[
				factory.createToken(SyntaxKind.ExportKeyword),
				factory.createToken(SyntaxKind.AsyncKeyword),
			],
			undefined,
			factory.createIdentifier(funcName),
			undefined,
			funcParams,
			factory.createTypeReferenceNode(factory.createIdentifier("Promise"), [
				factory.createArrayTypeNode(
					factory.createTypeReferenceNode(
						factory.createIdentifier(returnIface),
						undefined,
					),
				),
			]),
			factory.createBlock(
				[
					factory.createReturnStatement(
						factory.createCallExpression(
							factory.createPropertyAccessExpression(
								factory.createAwaitExpression(
									factory.createCallExpression(
										factory.createPropertyAccessExpression(
											factory.createCallExpression(
												factory.createPropertyAccessExpression(
													factory.createIdentifier("sql"),
													factory.createIdentifier("unsafe"),
												),
												undefined,
												[
													factory.createIdentifier(queryName),
													factory.createArrayLiteralExpression(
														params.map((param, i) =>
															factory.createPropertyAccessExpression(
																factory.createIdentifier("args"),
																factory.createIdentifier(
																	argName(i, param.column),
																),
															),
														),
														false,
													),
												],
											),
											factory.createIdentifier("values"),
										),
										undefined,
										undefined,
									),
								),
								factory.createIdentifier("map"),
							),
							undefined,
							[
								factory.createArrowFunction(
									undefined,
									undefined,
									[
										factory.createParameterDeclaration(
											undefined,
											undefined,
											"row",
										),
									],
									undefined,
									factory.createToken(SyntaxKind.EqualsGreaterThanToken),
									this.buildResultExpression(columns, embeds),
								),
							],
						),
					),
				],
				true,
			),
		);
	}

	oneDecl(
		funcName: string,
		queryName: string,
		argIface: string | undefined,
		returnIface: string,
		params: Parameter[],
		columns: Column[],
		embeds: Map<string, Column[]>,
	) {
		const funcParams = funcParamsDecl(argIface, params);

		return factory.createFunctionDeclaration(
			[
				factory.createToken(SyntaxKind.ExportKeyword),
				factory.createToken(SyntaxKind.AsyncKeyword),
			],
			undefined,
			factory.createIdentifier(funcName),
			undefined,
			funcParams,
			factory.createTypeReferenceNode(factory.createIdentifier("Promise"), [
				factory.createUnionTypeNode([
					factory.createTypeReferenceNode(
						factory.createIdentifier(returnIface),
						undefined,
					),
					factory.createLiteralTypeNode(factory.createNull()),
				]),
			]),
			factory.createBlock(
				[
					factory.createVariableStatement(
						undefined,
						factory.createVariableDeclarationList(
							[
								factory.createVariableDeclaration(
									factory.createIdentifier("rows"),
									undefined,
									undefined,
									factory.createAwaitExpression(
										factory.createCallExpression(
											factory.createPropertyAccessExpression(
												factory.createCallExpression(
													factory.createPropertyAccessExpression(
														factory.createIdentifier("sql"),
														factory.createIdentifier("unsafe"),
													),
													undefined,
													[
														factory.createIdentifier(queryName),
														factory.createArrayLiteralExpression(
															params.map((param, i) =>
																factory.createPropertyAccessExpression(
																	factory.createIdentifier("args"),
																	factory.createIdentifier(
																		argName(i, param.column),
																	),
																),
															),
															false,
														),
													],
												),
												factory.createIdentifier("values"),
											),
											undefined,
											undefined,
										),
									),
								),
							],
							NodeFlags.Const |
								// ts.NodeFlags.Constant |
								NodeFlags.AwaitContext |
								// ts.NodeFlags.Constant |
								NodeFlags.ContextFlags |
								NodeFlags.TypeExcludesFlags,
						),
					),
					factory.createIfStatement(
						factory.createBinaryExpression(
							factory.createPropertyAccessExpression(
								factory.createIdentifier("rows"),
								factory.createIdentifier("length"),
							),
							factory.createToken(SyntaxKind.ExclamationEqualsEqualsToken),
							factory.createNumericLiteral("1"),
						),
						factory.createBlock(
							[factory.createReturnStatement(factory.createNull())],
							true,
						),
						undefined,
					),
					factory.createVariableStatement(
						undefined,
						factory.createVariableDeclarationList(
							[
								factory.createVariableDeclaration(
									"row",
									undefined,
									undefined,
									factory.createElementAccessExpression(
										factory.createIdentifier("rows"),
										factory.createNumericLiteral("0"),
									),
								),
							],
							NodeFlags.Const,
						),
					),
					factory.createIfStatement(
						factory.createPrefixUnaryExpression(
							SyntaxKind.ExclamationToken,
							factory.createIdentifier("row"),
						),
						factory.createBlock(
							[factory.createReturnStatement(factory.createNull())],
							true,
						),
						undefined,
					),
					factory.createReturnStatement(
						this.buildResultExpression(columns, embeds),
					),
				],
				true,
			),
		);
	}

	buildResultExpression(columns: Column[], embeds: Map<string, Column[]>) {
		if (columns.length === 1) {
			return this.buildColumnAccessExpression(columns[0], "row", 0);
		}
		return factory.createObjectLiteralExpression(
			columns.map((col, i) =>
				factory.createPropertyAssignment(
					factory.createIdentifier(
						embeds.has(col.name)
							? singularize(colName(i, col))
							: colName(i, col),
					),
					!embeds.has(col.name)
						? this.buildColumnAccessExpression(col, "row", i)
						: factory.createObjectLiteralExpression(
								embeds
									.get(col.name)
									?.map((embed, j) =>
										factory.createPropertyAssignment(
											factory.createIdentifier(colName(j, embed)),
											this.buildColumnAccessExpression(embed, "row", i + j),
										),
									),
							),
				),
			),
			true,
		);
	}

	buildColumnAccessExpression(
		column: Column,
		name: string,
		i: number,
	): Expression {
		const access = factory.createElementAccessExpression(
			factory.createIdentifier(name),
			factory.createNumericLiteral(i),
		);

		let expr: ExpressionStatement | undefined;
		const type = this.parseDatabaseType(column.type?.name ?? "");
		function castTo(type: string, expr: Expression, isNew = false) {
			return factory.createExpressionStatement(
				(isNew ? factory.createNewExpression : factory.createCallExpression)(
					factory.createIdentifier(type),
					undefined,
					[expr],
				),
			);
		}
		if (type === "number") {
			expr = castTo("Number", access);
		} else if (type === "boolean") {
			expr = castTo("Boolean", access);
		} else if (type === "Date") {
			expr = castTo("Date", access, true);
		}

		return expr?.expression ?? access;
	}

	execlastidDecl(
		funcName: string,
		queryName: string,
		argIface: string | undefined,
		params: Parameter[],
	): FunctionDeclaration {
		const funcParams = funcParamsDecl(argIface, params);

		return factory.createFunctionDeclaration(
			[
				factory.createToken(SyntaxKind.ExportKeyword),
				factory.createToken(SyntaxKind.AsyncKeyword),
			],
			undefined,
			factory.createIdentifier(funcName),
			undefined,
			funcParams,
			factory.createTypeReferenceNode(factory.createIdentifier("Promise"), [
				factory.createTypeReferenceNode("number", undefined),
			]),
			factory.createBlock(
				[
					factory.createVariableStatement(
						undefined,
						factory.createVariableDeclarationList(
							[
								factory.createVariableDeclaration(
									factory.createArrayBindingPattern([
										factory.createBindingElement(
											undefined,
											undefined,
											factory.createIdentifier("result"),
											undefined,
										),
									]),
									undefined,
									undefined,
									factory.createAwaitExpression(
										factory.createCallExpression(
											factory.createPropertyAccessExpression(
												factory.createIdentifier("client"),
												factory.createIdentifier("query"),
											),
											[
												factory.createTypeReferenceNode(
													factory.createIdentifier("ResultSetHeader"),
													undefined,
												),
											],
											[
												factory.createObjectLiteralExpression(
													[
														factory.createPropertyAssignment(
															factory.createIdentifier("sql"),
															factory.createIdentifier(queryName),
														),
														factory.createPropertyAssignment(
															factory.createIdentifier("values"),
															factory.createArrayLiteralExpression(
																params.map((param, i) =>
																	factory.createPropertyAccessExpression(
																		factory.createIdentifier("args"),
																		factory.createIdentifier(
																			argName(i, param.column),
																		),
																	),
																),
																false,
															),
														),
													],
													true,
												),
											],
										),
									),
								),
							],
							NodeFlags.Const |
								// NodeFlags.Constant |
								NodeFlags.AwaitContext |
								// NodeFlags.Constant |
								NodeFlags.ContextFlags |
								NodeFlags.TypeExcludesFlags,
						),
					),
					factory.createReturnStatement(
						factory.createBinaryExpression(
							factory.createPropertyAccessChain(
								factory.createIdentifier("result"),
								factory.createToken(SyntaxKind.QuestionDotToken),
								factory.createIdentifier("insertId"),
							),
							factory.createToken(SyntaxKind.QuestionQuestionToken),
							factory.createNumericLiteral(0),
						),
					),
				],
				true,
			),
		);
	}
}
