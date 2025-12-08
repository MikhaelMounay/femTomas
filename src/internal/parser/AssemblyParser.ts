import type { Instruction } from "../types/Instruction";
import { InstructionType } from "../types/InstructionType";

export interface ParseError {
    line: number;
    message: string;
}

export interface ParseResult {
    instructions: Instruction[];
    errors: ParseError[];
    success: boolean;
}

export class AssemblyParser {
    private labels: Map<string, number> = new Map();
    private instructions: Instruction[] = [];
    private errors: ParseError[] = [];

    parse(assemblyCode: string): ParseResult {
        // Reset state
        this.labels.clear();
        this.instructions = [];
        this.errors = [];

        const lines = assemblyCode.split("\n").map((line) => line.trim());

        // First pass: identify labels and their positions
        let instructionIndex = 0;
        for (let lineNum = 0; lineNum < lines.length; lineNum++) {
            const line = lines[lineNum];
            if (!line || line.startsWith(";") || line.startsWith("//")) {
                continue; // skip empty lines and comments
            }

            // Check for label (format: "Label:" or "Label: instruction")
            const labelMatch = line.match(/^([a-zA-Z_][a-zA-Z0-9_]*)\s*:/);
            if (labelMatch) {
                const labelName = labelMatch[1];
                this.labels.set(labelName, instructionIndex);

                // Check if there's an instruction on the same line after the label
                const restOfLine = line.substring(labelMatch[0].length).trim();
                if (restOfLine && !restOfLine.startsWith(";") && !restOfLine.startsWith("//")) {
                    instructionIndex++;
                }
            } else {
                instructionIndex++;
            }
        }

        // Second pass: parse instructions
        instructionIndex = 0;
        for (let lineNum = 0; lineNum < lines.length; lineNum++) {
            let line = lines[lineNum];
            if (!line || line.startsWith(";") || line.startsWith("//")) {
                continue;
            }

            // Remove label if present
            const labelMatch = line.match(/^([a-zA-Z_][a-zA-Z0-9_]*)\s*:/);
            if (labelMatch) {
                line = line.substring(labelMatch[0].length).trim();
                if (!line || line.startsWith(";") || line.startsWith("//")) {
                    continue;
                }
            }

            // Remove inline comments (match either ; or //)
            const commentIndex = line.search(/;|\/\//);
            if (commentIndex !== -1) {
                line = line.substring(0, commentIndex).trim();
            }

            if (!line) continue;

            try {
                const instruction = this.parseInstruction(line, instructionIndex);
                if (instruction) {
                    this.instructions.push(instruction);
                    instructionIndex++;
                }
            } catch (error) {
                this.errors.push({
                    line: lineNum + 1,
                    message: error instanceof Error ? error.message : String(error),
                });
            }
        }

        // Third pass: resolve label references
        this.resolveLabels();

        return {
            instructions: this.instructions,
            errors: this.errors,
            success: this.errors.length === 0,
        };
    }

    private parseInstruction(line: string, instrIndex: number): Instruction | null {
        // Match instruction pattern
        const parts = line.split(/[\s,()]+/).filter((p) => p);
        if (parts.length === 0) return null;

        const opcode = parts[0].toUpperCase();
        const _text = line;
        const _id = instrIndex;

        switch (opcode) {
            case "LOAD": {
                // LOAD Rdest, offset(Rbase)
                // Examples: LOAD R1, 4(R0) or LOAD R1, 0(R2)
                if (parts.length < 3) {
                    throw new Error(`LOAD instruction requires format: LOAD Rdest, offset(Rbase)`);
                }
                const dest = this.parseRegister(parts[1]);

                // Parse offset(Rbase)
                const offsetMatch = line.match(/(\d+)\s*\(\s*R(\d+)\s*\)/i);
                if (!offsetMatch) {
                    throw new Error(`LOAD instruction requires format: LOAD Rdest, offset(Rbase)`);
                }
                const offset = parseInt(offsetMatch[1]);
                const src1 = parseInt(offsetMatch[2]);

                return { _id, type: InstructionType.LOAD, dest, src1, offset, _text };
            }

            case "STORE": {
                // STORE Rsrc, offset(Rbase)
                // Examples: STORE R5, 4(R1)
                if (parts.length < 3) {
                    throw new Error(`STORE instruction requires format: STORE Rsrc, offset(Rbase)`);
                }
                const src2 = this.parseRegister(parts[1]); // value to store

                // Parse offset(Rbase)
                const offsetMatch = line.match(/(\d+)\s*\(\s*R(\d+)\s*\)/i);
                if (!offsetMatch) {
                    throw new Error(`STORE instruction requires format: STORE Rsrc, offset(Rbase)`);
                }
                const offset = parseInt(offsetMatch[1]);
                const src1 = parseInt(offsetMatch[2]); // base register

                return { _id, type: InstructionType.STORE, src1, src2, offset, _text };
            }

            case "ADD": {
                // ADD Rdest, Rsrc1, Rsrc2
                if (parts.length !== 4) {
                    throw new Error(`ADD instruction requires format: ADD Rdest, Rsrc1, Rsrc2`);
                }
                const dest = this.parseRegister(parts[1]);
                const src1 = this.parseRegister(parts[2]);
                const src2 = this.parseRegister(parts[3]);
                return { _id, type: InstructionType.ADD, dest, src1, src2, _text };
            }

            case "SUB": {
                // SUB Rdest, Rsrc1, Rsrc2
                if (parts.length !== 4) {
                    throw new Error(`SUB instruction requires format: SUB Rdest, Rsrc1, Rsrc2`);
                }
                const dest = this.parseRegister(parts[1]);
                const src1 = this.parseRegister(parts[2]);
                const src2 = this.parseRegister(parts[3]);
                return { _id, type: InstructionType.SUB, dest, src1, src2, _text };
            }

            case "MUL": {
                // MUL Rdest, Rsrc1, Rsrc2
                if (parts.length !== 4) {
                    throw new Error(`MUL instruction requires format: MUL Rdest, Rsrc1, Rsrc2`);
                }
                const dest = this.parseRegister(parts[1]);
                const src1 = this.parseRegister(parts[2]);
                const src2 = this.parseRegister(parts[3]);
                return { _id, type: InstructionType.MUL, dest, src1, src2, _text };
            }

            case "NAND": {
                // NAND Rdest, Rsrc1, Rsrc2
                if (parts.length !== 4) {
                    throw new Error(`NAND instruction requires format: NAND Rdest, Rsrc1, Rsrc2`);
                }
                const dest = this.parseRegister(parts[1]);
                const src1 = this.parseRegister(parts[2]);
                const src2 = this.parseRegister(parts[3]);
                return { _id, type: InstructionType.NAND, dest, src1, src2, _text };
            }

            case "BEQ": {
                // BEQ Rsrc1, Rsrc2, offset/label
                if (parts.length !== 4) {
                    throw new Error(`BEQ instruction requires format: BEQ Rsrc1, Rsrc2, offset/label`);
                }
                const src1 = this.parseRegister(parts[1]);
                const src2 = this.parseRegister(parts[2]);

                // Check if it's a label or numeric offset
                const offsetOrLabel = parts[3];
                let offset: number;
                let labelRef: string | undefined;

                if (/^-?\d+$/.test(offsetOrLabel)) {
                    // Numeric offset
                    offset = parseInt(offsetOrLabel);
                } else {
                    // Label reference - will be resolved later
                    offset = 0; // placeholder
                    labelRef = offsetOrLabel;
                }

                const instr: any = { _id, type: InstructionType.BEQ, src1, src2, offset, _text };
                if (labelRef) {
                    instr._labelRef = labelRef;
                }
                return instr;
            }

            case "CALL": {
                // CALL label
                if (parts.length !== 2) {
                    throw new Error(`CALL instruction requires format: CALL label`);
                }
                const labelName = parts[1];
                // Label will be resolved later
                return {
                    _id,
                    type: InstructionType.CALL,
                    label: 0, // placeholder
                    _text,
                    _labelRef: labelName,
                } as any;
            }

            case "RET": {
                // RET (no operands)
                return { _id, type: InstructionType.RET, _text };
            }

            default:
                throw new Error(`Unknown instruction: ${opcode}`);
        }
    }

    private parseRegister(reg: string): number {
        const match = reg.match(/^R(\d+)$/i);
        if (!match) {
            throw new Error(`Invalid register format: ${reg}. Expected format: R0-R7`);
        }
        const regNum = parseInt(match[1]);
        if (regNum < 0 || regNum > 7) {
            throw new Error(`Register number out of range: ${regNum}. Must be 0-7`);
        }
        return regNum;
    }

    private resolveLabels() {
        for (let i = 0; i < this.instructions.length; i++) {
            const instr = this.instructions[i] as any;

            if (instr._labelRef) {
                const labelName = instr._labelRef;
                const targetIndex = this.labels.get(labelName);

                if (targetIndex === undefined) {
                    this.errors.push({
                        line: i + 1,
                        message: `Undefined label: ${labelName}`,
                    });
                    continue;
                }

                if (instr.type === InstructionType.BEQ) {
                    // For BEQ, offset is relative to PC (target - current)
                    instr.offset = targetIndex - i;
                } else if (instr.type === InstructionType.CALL) {
                    // For CALL, label is absolute address
                    instr.label = targetIndex;
                }

                // Clean up temporary field
                delete instr._labelRef;
            }
        }
    }
}

// Helper function to export for easy use
export function parseAssembly(code: string): ParseResult {
    const parser = new AssemblyParser();
    return parser.parse(code);
}
