"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
jest.mock('ink', () => ({
    Text: () => null,
    render: jest.fn()
}));
const index_1 = __importDefault(require("../index"));
describe('CLI program', () => {
    it('should export a commander program', () => {
        expect(typeof index_1.default.parse).toBe('function');
    });
});
