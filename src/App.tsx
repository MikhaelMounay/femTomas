import { useState } from "react";
import { CPU } from "./internal/cpu";
import { parseAssembly, type ParseResult } from "./internal/parser/AssemblyParser";
import type { Instruction } from "./internal/types/Instruction";
import ProgramView from "./components/ProgramView";
import RegisterFileView from "./components/RegisterFileView";
import MemoryView from "./components/MemoryView";
import ROBView from "./components/ROBView";
import ReservationStationsView from "./components/ReservationStationsView";
import { parseMemoryInit } from "./internal/parser/parseMemoryInit";

// Convert demo program to assembly text for initial display
const demoAssemblyText = `; Demo Program - Tomasulo Simulator
; This program demonstrates LOAD/STORE, ALU operations, CALL/RET, and BEQ operations.
; (remove the BEQ to test the CALL/RET instructions).

LOAD R1, 4(R0)
LOAD R2, 8(R0)
LOAD R3, 12(R0)
ADD R4, R3, R2
STORE R4, 0(R0)
NAND R5, R4, R3
MUL R5, R5, R2
SUB R6, R5, R3
BEQ R0, R0, Exit
CALL L
STORE R6, 4(R0)

L: ADD R1, R1, R1
   SUB R1, R1, R1
   RET

Exit:
`;

const defaultMemoryInit = `4: 10
8: 20
12: 30`;

function App() {
    const [cpu] = useState(() => new CPU());
    const [, forceUpdate] = useState(0);
    const [isRunning, setIsRunning] = useState(false);
    const [autoRunInterval, setAutoRunInterval] = useState<number | null>(null);

    // Assembly editor state
    const [assemblyCode, setAssemblyCode] = useState(demoAssemblyText);
    const [memoryInitText, setMemoryInitText] = useState(defaultMemoryInit);
    const [parseErrors, setParseErrors] = useState<ParseResult["errors"]>([]);
    const [memoryErrors, setMemoryErrors] = useState<string[]>([]);
    const [showEditor, setShowEditor] = useState(true);
    const [isProgramLoaded, setIsProgramLoaded] = useState(false);

    const initializeCPU = (program: Instruction[], memory: Map<number, number>) => {
        cpu.reset();
        cpu.loadProgram(program);
        cpu.loadMemory(memory);
        setIsProgramLoaded(true);
        forceUpdate((n) => n + 1);
    };

    const assembleAndLoad = () => {
        const programResult = parseAssembly(assemblyCode);
        const memoryResult = parseMemoryInit(memoryInitText);

        if (!programResult.success || !memoryResult.success) {
            setParseErrors(programResult.errors);
            setMemoryErrors(memoryResult.errors || []);
            return;
        }

        setParseErrors([]);
        setMemoryErrors([]);
        initializeCPU(programResult.instructions, memoryResult.memory!);
        setShowEditor(false);
    };

    const loadDemoProgram = () => {
        setAssemblyCode(demoAssemblyText);
        setMemoryInitText(defaultMemoryInit);
        setParseErrors([]);
        setMemoryErrors([]);
    };

    const step = () => {
        if (cpu.pc < cpu.program.length || cpu.rob.length > 0) {
            cpu.step();
            forceUpdate((n) => n + 1);
        }
    };

    const reset = () => {
        cpu.reset();
        setIsRunning(false);
        setIsProgramLoaded(false);
        if (autoRunInterval) {
            clearInterval(autoRunInterval);
            setAutoRunInterval(null);
        }
        setShowEditor(true);
        forceUpdate((n) => n + 1);
    };

    const runToCompletion = () => {
        cpu.run(1000);
        forceUpdate((n) => n + 1);
    };

    const toggleAutoRun = () => {
        if (isRunning) {
            if (autoRunInterval) {
                clearInterval(autoRunInterval);
                setAutoRunInterval(null);
            }
            setIsRunning(false);
        } else {
            const interval = window.setInterval(() => {
                if (cpu.pc < cpu.program.length || cpu.rob.length > 0) {
                    cpu.step();
                    forceUpdate((n) => n + 1);
                } else {
                    clearInterval(interval);
                    setIsRunning(false);
                    setAutoRunInterval(null);
                }
            }, 500);
            setAutoRunInterval(interval);
            setIsRunning(true);
        }
    };

    const isComplete = cpu.pc >= cpu.program.length && cpu.rob.length === 0;

    // Calculate statistics
    const committedInstructions = Array.from(cpu.instrTiming.values()).filter(
        (timing) => timing.commitCycle !== undefined && !timing.flushed
    ).length;
    const totalCycles = cpu.cycle - 1;
    const ipc = committedInstructions > 0 && totalCycles > 0 ? (committedInstructions / totalCycles).toFixed(3) : "0.000";
    const branchAccuracy =
        cpu.totalBranches > 0
            ? (((cpu.totalBranches - cpu.branchMispredictions) / cpu.totalBranches) * 100).toFixed(2)
            : "N/A";
    const mispredictionRate =
        cpu.totalBranches > 0 ? ((cpu.branchMispredictions / cpu.totalBranches) * 100).toFixed(2) : "0.00";

    return (
        <div className="min-h-screen bg-gray-50 p-6 text-gray-900">
            <div className="mx-auto max-w-[1800px] space-y-6">
                {/* Header */}
                <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-lg">
                    <h1 className="mb-4 text-3xl font-bold text-blue-600">Tomasulo Algorithm Simulator</h1>
                    {isProgramLoaded && (
                        <div className="flex flex-wrap items-center gap-4">
                            <div className="text-lg">
                                <span className="text-gray-600">Cycle:</span>{" "}
                                <span className="font-mono font-bold text-green-600">{cpu.cycle}</span>
                            </div>
                            <div className="text-lg">
                                <span className="text-gray-600">PC:</span>{" "}
                                <span className="font-mono font-bold text-amber-600">{cpu.pc}</span>
                            </div>
                            <div className="text-lg">
                                <span className="text-gray-600">Status:</span>{" "}
                                <span className={`font-bold ${isComplete ? "text-green-600" : "text-blue-600"}`}>
                                    {isComplete ? "COMPLETE" : "RUNNING"}
                                </span>
                            </div>
                        </div>
                    )}
                </div>

                {/* Assembly Editor */}
                {showEditor && (
                    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-lg">
                        <div className="mb-4 flex items-center justify-between">
                            <h2 className="text-2xl font-bold text-blue-600">Assembly Editor</h2>
                            <button
                                onClick={loadDemoProgram}
                                className="rounded bg-gray-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-gray-700"
                            >
                                Load Demo Program
                            </button>
                        </div>

                        <div className="space-y-4">
                            {/* Assembly Code Editor */}
                            <div>
                                <label className="mb-2 block text-sm font-semibold text-gray-700">Assembly Code</label>
                                <textarea
                                    value={assemblyCode}
                                    onChange={(e) => setAssemblyCode(e.target.value)}
                                    className="h-80 w-full rounded-lg border-2 border-gray-300 bg-gray-50 p-4 font-mono text-sm focus:border-blue-500 focus:outline-none"
                                    placeholder="Enter your assembly code here..."
                                    spellCheck={false}
                                />
                            </div>

                            {/* Memory Initialization Editor */}
                            <div>
                                <label className="mb-2 block text-sm font-semibold text-gray-700">
                                    Memory Initialization
                                </label>
                                <textarea
                                    value={memoryInitText}
                                    onChange={(e) => setMemoryInitText(e.target.value)}
                                    className="h-32 w-full rounded-lg border-2 border-gray-300 bg-gray-50 p-4 font-mono text-sm focus:border-blue-500 focus:outline-none"
                                    placeholder="Enter memory initialization (e.g., 4: 10)"
                                    spellCheck={false}
                                />
                                <p className="mt-1 text-xs text-gray-500">
                                    Format: One entry per line as "address: value" or "address=value". Comments start with ;
                                    or //
                                </p>
                            </div>

                            {/* Error Display */}
                            {(parseErrors.length > 0 || memoryErrors.length > 0) && (
                                <div className="space-y-2">
                                    {parseErrors.length > 0 && (
                                        <div className="rounded-lg border-2 border-red-300 bg-red-50 p-4">
                                            <h3 className="mb-2 font-bold text-red-700">Assembly Parse Errors:</h3>
                                            <ul className="space-y-1">
                                                {parseErrors.map((error, idx) => (
                                                    <li key={idx} className="text-sm text-red-600">
                                                        Line {error.line}: {error.message}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                    {memoryErrors.length > 0 && (
                                        <div className="rounded-lg border-2 border-red-300 bg-red-50 p-4">
                                            <h3 className="mb-2 font-bold text-red-700">Memory Initialization Errors:</h3>
                                            <ul className="space-y-1">
                                                {memoryErrors.map((error, idx) => (
                                                    <li key={idx} className="text-sm text-red-600">
                                                        {error}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                </div>
                            )}

                            <div className="flex gap-3">
                                <button
                                    onClick={assembleAndLoad}
                                    className="rounded bg-green-600 px-6 py-3 font-semibold text-white transition-colors hover:bg-green-700"
                                >
                                    Assemble & Load Program
                                </button>
                                {isProgramLoaded && (
                                    <button
                                        onClick={() => setShowEditor(false)}
                                        className="rounded bg-blue-600 px-6 py-3 font-semibold text-white transition-colors hover:bg-blue-700"
                                    >
                                        Hide Editor
                                    </button>
                                )}
                            </div>

                            <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
                                <h3 className="mb-2 font-bold text-blue-800">Supported Instructions:</h3>
                                <div className="grid grid-cols-1 gap-2 font-mono text-sm text-blue-900 md:grid-cols-2">
                                    <div>• LOAD Rdest, offset(Rbase)</div>
                                    <div>• STORE Rsrc, offset(Rbase)</div>
                                    <div>• ADD Rdest, Rsrc1, Rsrc2</div>
                                    <div>• SUB Rdest, Rsrc1, Rsrc2</div>
                                    <div>• MUL Rdest, Rsrc1, Rsrc2</div>
                                    <div>• NAND Rdest, Rsrc1, Rsrc2</div>
                                    <div>• BEQ Rsrc1, Rsrc2, label/offset</div>
                                    <div>• CALL label</div>
                                    <div>• RET</div>
                                </div>
                                <p className="mt-2 text-xs text-blue-700">
                                    Comments: Use ; or // at the start of a line or after an instruction
                                    <br />
                                    Labels: Format as "LabelName:" (labels must start with a letter or underscore)
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Statistics Panel - Show when complete */}
                {!showEditor && isProgramLoaded && isComplete && (
                    <div className="rounded-lg border-2 border-blue-300 bg-linear-to-r from-blue-50 to-purple-50 p-6 shadow-lg">
                        <h2 className="mb-4 text-2xl font-bold text-blue-700">Execution Statistics</h2>
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                            <div className="rounded-lg border border-gray-200 bg-white p-4">
                                <div className="mb-1 text-sm text-gray-600">Total Cycles</div>
                                <div className="font-mono text-3xl font-bold text-green-600">{totalCycles}</div>
                            </div>
                            <div className="rounded-lg border border-gray-200 bg-white p-4">
                                <div className="mb-1 text-sm text-gray-600">Instructions Committed</div>
                                <div className="font-mono text-3xl font-bold text-blue-600">{committedInstructions}</div>
                            </div>
                            <div className="rounded-lg border border-gray-200 bg-white p-4">
                                <div className="mb-1 text-sm text-gray-600">IPC (Instructions Per Cycle)</div>
                                <div className="font-mono text-3xl font-bold text-purple-600">{ipc}</div>
                            </div>
                            <div className="rounded-lg border border-gray-200 bg-white p-4">
                                <div className="mb-1 text-sm text-gray-600">Branch Misprediction Rate</div>
                                <div className="font-mono text-3xl font-bold text-orange-600">{mispredictionRate}%</div>
                                <div className="mt-1 text-xs text-gray-500">
                                    {cpu.branchMispredictions}/{cpu.totalBranches} mispredicted
                                </div>
                            </div>
                        </div>

                        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
                            <div className="rounded-lg border border-gray-200 bg-white p-3">
                                <div className="text-xs text-gray-600">Branch Prediction Accuracy</div>
                                <div className="font-mono text-xl font-bold text-green-600">{branchAccuracy}%</div>
                            </div>
                            <div className="rounded-lg border border-gray-200 bg-white p-3">
                                <div className="text-xs text-gray-600">Average Cycles per Instruction</div>
                                <div className="font-mono text-xl font-bold text-cyan-600">
                                    {committedInstructions > 0 ? (totalCycles / committedInstructions).toFixed(3) : "N/A"}
                                </div>
                            </div>
                            <div className="rounded-lg border border-gray-200 bg-white p-3">
                                <div className="text-xs text-gray-600">Total Instructions Issued</div>
                                <div className="font-mono text-xl font-bold text-amber-600">{cpu.instrTiming.size}</div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Controls */}
                {!showEditor && isProgramLoaded && (
                    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-lg">
                        <div className="flex gap-3">
                            <button
                                onClick={step}
                                disabled={isComplete || isRunning}
                                className="rounded bg-blue-600 px-6 py-2 font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-500"
                            >
                                Step
                            </button>
                            <button
                                onClick={toggleAutoRun}
                                disabled={isComplete}
                                className={`rounded px-6 py-2 font-semibold text-white transition-colors ${
                                    isRunning ? "bg-orange-600 hover:bg-orange-700" : "bg-green-600 hover:bg-green-700"
                                } disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-500`}
                            >
                                {isRunning ? "Pause" : "Auto Run"}
                            </button>
                            <button
                                onClick={runToCompletion}
                                disabled={isComplete || isRunning}
                                className="rounded bg-purple-600 px-6 py-2 font-semibold text-white transition-colors hover:bg-purple-700 disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-500"
                            >
                                Run to End
                            </button>
                            <button
                                onClick={reset}
                                className="rounded bg-red-600 px-6 py-2 font-semibold text-white transition-colors hover:bg-red-700"
                            >
                                Reset
                            </button>
                            <button
                                onClick={() => setShowEditor(true)}
                                className="rounded bg-gray-600 px-6 py-2 font-semibold text-white transition-colors hover:bg-gray-700"
                            >
                                Show Editor
                            </button>
                        </div>
                    </div>
                )}

                {/* Main Grid - Only show when editor is hidden and program is loaded */}
                {!showEditor && isProgramLoaded && (
                    <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                        <div className="space-y-6">
                            <ProgramView instructions={cpu.program} pc={cpu.pc} instrTiming={cpu.instrTiming} />
                            <RegisterFileView registers={cpu.registers} />
                            <MemoryView memory={cpu.memory} />
                        </div>
                        <div className="space-y-6">
                            <ROBView rob={cpu.rob} />
                            <ReservationStationsView stations={cpu.reservationStationsMap} />
                        </div>
                    </div>
                )}

                {/* Footer - Project Info */}
                <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-lg">
                    <div className="space-y-3">
                        <div className="flex items-center justify-between border-b border-gray-200 pb-3">
                            <h3 className="text-xl font-bold text-gray-800">femTomas</h3>
                            <span className="text-sm text-gray-500">Tomasulo Algorithm Simulator for RiSC-16</span>
                        </div>

                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            <div>
                                <h4 className="mb-2 font-semibold text-gray-700">Project Information</h4>
                                <p className="text-sm text-gray-600">
                                    A web-based simulator implementing the Tomasulo algorithm for dynamic instruction
                                    scheduling with speculative execution, built with TypeScript and React.
                                </p>
                            </div>

                            <div>
                                <h4 className="mb-2 font-semibold text-gray-700">ISA & Features</h4>
                                <ul className="space-y-1 text-sm text-gray-600">
                                    <li>• RiSC-16 inspired by Bruce Jacob's Ridiculously Simple Computer</li>
                                    <li>• 8-entry Reorder Buffer (ROB) for in-order commit</li>
                                    <li>• Multiple reservation stations per functional unit</li>
                                    <li>• Always-not-taken branch prediction with misprediction recovery</li>
                                    <li>• Assembly language parser with label support</li>
                                </ul>
                            </div>
                        </div>

                        <div className="border-t border-gray-200 pt-3 text-center text-xs text-gray-500">
                            <p className="mt-2 text-sm text-gray-500">
                                Made with ❤️ by <strong>AUC</strong> Students, <em>CSCE 3301 - Computer Architecture</em>{" "}
                                Course Project, Fall 2025
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default App;
