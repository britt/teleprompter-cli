#!/usr/bin/env node
"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.List = void 0;
const react_1 = __importStar(require("react"));
const ink = __importStar(require("ink"));
const { render, Text } = ink;
const commander_1 = require("commander");
const axios_1 = __importDefault(require("axios"));
const as_table_1 = __importDefault(require("as-table"));
const List = ({ url }) => {
    const [prompts, setPrompts] = (0, react_1.useState)(null);
    const [error, setError] = (0, react_1.useState)(null);
    (0, react_1.useEffect)(() => {
        function fetchPrompts() {
            return __awaiter(this, void 0, void 0, function* () {
                try {
                    const res = yield axios_1.default.get(`${url}/prompts`);
                    setPrompts(res.data);
                }
                catch (err) {
                    setError(err.message);
                }
            });
        }
        fetchPrompts();
    }, [url]);
    if (error) {
        return react_1.default.createElement(Text, { color: "red" },
            "Error: ",
            error);
    }
    if (!prompts) {
        return react_1.default.createElement(Text, null, "Loading...");
    }
    if (prompts.length === 0) {
        return react_1.default.createElement(Text, null, "No prompts found.");
    }
    const table = (0, as_table_1.default)(prompts.map(p => ({ id: p.id, namespace: p.namespace })));
    return react_1.default.createElement(Text, null, "\n" + table);
};
exports.List = List;
const program = new commander_1.Command();
program
    .name('tp-ink')
    .description('Teleprompter CLI (Ink version)');
program
    .command('list')
    .description('List all active prompts')
    .option('-u, --url <url>', 'URL of the teleprompter service')
    .action((options) => {
    const url = options.url || process.env.TP_URL;
    if (!url) {
        console.error('Error: --url option or TP_URL environment variable must be set');
        process.exit(1);
    }
    render(react_1.default.createElement(exports.List, { url: url }));
});
if (require.main === module) {
    program.parse(process.argv);
}
exports.default = program;
