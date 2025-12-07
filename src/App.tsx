import { useState } from "react";
import { CPU } from "./internal/cpu";
import { demoProgram } from "./internal/tests/demoProgram";
import type { Instruction } from "./internal/types/Instruction";
import type { ReservationStation } from "./internal/types/ReservationStation";
import type { ROBEntry } from "./internal/types/ROBEntry";

function App() {
    const [cpu] = useState(() => {
        const c = new CPU();
        c.loadProgram(demoProgram);
        c.loadMemory(
            new Map([
                [0, 10],
                [4, 20],
                [8, 30],
            ])
        );
        return c;
    });

    const [, forceUpdate] = useState(0);
    const [isRunning, setIsRunning] = useState(false);
    const [autoRunInterval, setAutoRunInterval] = useState<number | null>(null);

    const step = () => {
        if (cpu.pc < cpu.program.length || cpu.rob.length > 0) {
            cpu.step();
            forceUpdate((n) => n + 1);
        }
    };

    const reset = () => {
        cpu.reset();
        cpu.loadProgram(demoProgram);
        cpu.loadMemory(
            new Map([
                [0, 10],
                [4, 20],
                [8, 30],
            ])
        );
        setIsRunning(false);
        if (autoRunInterval) {
            clearInterval(autoRunInterval);
            setAutoRunInterval(null);
        }
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
    const totalCycles = cpu.cycle - 1; // -1 because cycle starts at 1
    const ipc = committedInstructions > 0 && totalCycles > 0 ? (committedInstructions / totalCycles).toFixed(3) : "0.000";
    const branchAccuracy =
        cpu.totalBranches > 0
            ? (((cpu.totalBranches - cpu.branchMispredictions) / cpu.totalBranches) * 100).toFixed(2)
            : "N/A";
    const mispredictionRate =
        cpu.totalBranches > 0 ? ((cpu.branchMispredictions / cpu.totalBranches) * 100).toFixed(2) : "0.00";

    return (
        <div className="min-h-screen bg-gray-900 p-6 text-gray-100">
            <div className="mx-auto max-w-[1800px] space-y-6">
                {/* Header */}
                <div className="rounded-lg bg-gray-800 p-6 shadow-lg">
                    <h1 className="mb-4 text-3xl font-bold text-blue-400">Tomasulo Algorithm Simulator</h1>
                    <div className="flex flex-wrap items-center gap-4">
                        <div className="text-lg">
                            <span className="text-gray-400">Cycle:</span>{" "}
                            <span className="font-mono font-bold text-green-400">{cpu.cycle}</span>
                        </div>
                        <div className="text-lg">
                            <span className="text-gray-400">PC:</span>{" "}
                            <span className="font-mono font-bold text-yellow-400">{cpu.pc}</span>
                        </div>
                        <div className="text-lg">
                            <span className="text-gray-400">Status:</span>{" "}
                            <span className={`font-bold ${isComplete ? "text-green-400" : "text-blue-400"}`}>
                                {isComplete ? "COMPLETE" : "RUNNING"}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Statistics Panel - Show when complete */}
                {isComplete && (
                    <div className="rounded-lg border border-blue-500/30 bg-linear-to-r from-blue-900/50 to-purple-900/50 p-6 shadow-lg">
                        <h2 className="mb-4 text-2xl font-bold text-blue-300">Execution Statistics</h2>
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                            <div className="rounded-lg bg-gray-800/50 p-4">
                                <div className="mb-1 text-sm text-gray-400">Total Cycles</div>
                                <div className="font-mono text-3xl font-bold text-green-400">{totalCycles}</div>
                            </div>
                            <div className="rounded-lg bg-gray-800/50 p-4">
                                <div className="mb-1 text-sm text-gray-400">Instructions Committed</div>
                                <div className="font-mono text-3xl font-bold text-blue-400">{committedInstructions}</div>
                            </div>
                            <div className="rounded-lg bg-gray-800/50 p-4">
                                <div className="mb-1 text-sm text-gray-400">IPC (Instructions Per Cycle)</div>
                                <div className="font-mono text-3xl font-bold text-purple-400">{ipc}</div>
                            </div>
                            <div className="rounded-lg bg-gray-800/50 p-4">
                                <div className="mb-1 text-sm text-gray-400">Branch Misprediction Rate</div>
                                <div className="font-mono text-3xl font-bold text-orange-400">{mispredictionRate}%</div>
                                <div className="mt-1 text-xs text-gray-500">
                                    {cpu.branchMispredictions}/{cpu.totalBranches} mispredicted
                                </div>
                            </div>
                        </div>

                        {/* Additional metrics */}
                        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
                            <div className="rounded-lg bg-gray-800/50 p-3">
                                <div className="text-xs text-gray-400">Branch Prediction Accuracy</div>
                                <div className="font-mono text-xl font-bold text-green-400">{branchAccuracy}%</div>
                            </div>
                            <div className="rounded-lg bg-gray-800/50 p-3">
                                <div className="text-xs text-gray-400">Average Cycles per Instruction</div>
                                <div className="font-mono text-xl font-bold text-cyan-400">
                                    {committedInstructions > 0 ? (totalCycles / committedInstructions).toFixed(3) : "N/A"}
                                </div>
                            </div>
                            <div className="rounded-lg bg-gray-800/50 p-3">
                                <div className="text-xs text-gray-400">Total Instructions Issued</div>
                                <div className="font-mono text-xl font-bold text-yellow-400">{cpu.instrTiming.size}</div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Controls */}
                <div className="rounded-lg bg-gray-800 p-4 shadow-lg">
                    <div className="flex gap-3">
                        <button
                            onClick={step}
                            disabled={isComplete || isRunning}
                            className="rounded bg-blue-600 px-6 py-2 font-semibold transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-600"
                        >
                            Step
                        </button>
                        <button
                            onClick={toggleAutoRun}
                            disabled={isComplete}
                            className={`rounded px-6 py-2 font-semibold transition-colors ${
                                isRunning ? "bg-orange-600 hover:bg-orange-700" : "bg-green-600 hover:bg-green-700"
                            } disabled:cursor-not-allowed disabled:bg-gray-600`}
                        >
                            {isRunning ? "Pause" : "Auto Run"}
                        </button>
                        <button
                            onClick={runToCompletion}
                            disabled={isComplete || isRunning}
                            className="rounded bg-purple-600 px-6 py-2 font-semibold transition-colors hover:bg-purple-700 disabled:cursor-not-allowed disabled:bg-gray-600"
                        >
                            Run to End
                        </button>
                        <button
                            onClick={reset}
                            className="rounded bg-red-600 px-6 py-2 font-semibold transition-colors hover:bg-red-700"
                        >
                            Reset
                        </button>
                    </div>
                </div>

                {/* Main Grid */}
                <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                    {/* Left Column */}
                    <div className="space-y-6">
                        {/* Program Instructions */}
                        <ProgramView instructions={cpu.program} pc={cpu.pc} instrTiming={cpu.instrTiming} />

                        {/* Registers */}
                        <RegisterFileView registers={cpu.registers} />

                        {/* Memory */}
                        <MemoryView memory={cpu.memory} />
                    </div>

                    {/* Right Column */}
                    <div className="space-y-6">
                        {/* ROB */}
                        <ROBView rob={cpu.rob} />

                        {/* Reservation Stations */}
                        <ReservationStationsView stations={cpu.reservationStationsMap} />
                    </div>
                </div>
            </div>
        </div>
    );
}

// Program View Component
function ProgramView({
    instructions,
    pc,
    instrTiming,
}: {
    instructions: Instruction[];
    pc: number;
    instrTiming: Map<number, Partial<ROBEntry>>;
}) {
    return (
        <div className="rounded-lg bg-gray-800 p-4 shadow-lg">
            <h2 className="mb-3 text-xl font-bold text-blue-400">Program Instructions</h2>
            <div className="overflow-x-auto">
                <table className="w-full font-mono text-sm">
                    <thead>
                        <tr className="border-b border-gray-700">
                            <th className="px-2 py-2 text-left text-gray-400">PC</th>
                            <th className="px-2 py-2 text-left text-gray-400">Instruction</th>
                            <th className="px-2 py-2 text-left text-gray-400">Issue</th>
                            <th className="px-2 py-2 text-left text-gray-400">ExStart</th>
                            <th className="px-2 py-2 text-left text-gray-400">ExEnd</th>
                            <th className="px-2 py-2 text-left text-gray-400">Write</th>
                            <th className="px-2 py-2 text-left text-gray-400">Commit</th>
                        </tr>
                    </thead>
                    <tbody>
                        {instructions.map((instr, idx) => {
                            const timing = instrTiming.get(instr._id);
                            const isCurrent = idx === pc;
                            const isFlushed = timing?.flushed === true;
                            return (
                                <tr
                                    key={instr._id}
                                    className={`border-b border-gray-700 ${isCurrent ? "bg-blue-900/30" : ""} ${
                                        isFlushed ? "opacity-50" : ""
                                    }`}
                                >
                                    <td className="px-2 py-2">
                                        {isCurrent && <span className="text-yellow-400">→ </span>}
                                        {idx}
                                    </td>
                                    <td className="px-2 py-2 text-gray-300">
                                        {instr._text || `${instr.type}`}
                                        {isFlushed && <span className="ml-2 text-xs text-red-400">(flushed)</span>}
                                    </td>
                                    <td className="px-2 py-2 text-green-400">{timing?.issuedCycle ?? "-"}</td>
                                    <td className="px-2 py-2 text-blue-400">{timing?.execStartCycle ?? "-"}</td>
                                    <td className="px-2 py-2 text-blue-400">{timing?.execCompleteCycle ?? "-"}</td>
                                    <td className="px-2 py-2 text-purple-400">{timing?.writeResultCycle ?? "-"}</td>
                                    <td className="px-2 py-2 text-orange-400">{timing?.commitCycle ?? "-"}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

// Register File View
function RegisterFileView({ registers }: { registers: number[] }) {
    return (
        <div className="rounded-lg bg-gray-800 p-4 shadow-lg">
            <h2 className="mb-3 text-xl font-bold text-blue-400">Register File</h2>
            <div className="grid grid-cols-4 gap-3">
                {registers.map((value, idx) => (
                    <div key={idx} className="rounded bg-gray-700 p-2">
                        <div className="text-xs text-gray-400">R{idx}</div>
                        <div className="font-mono text-lg text-green-400">{value}</div>
                    </div>
                ))}
            </div>
        </div>
    );
}

// Memory View
function MemoryView({ memory }: { memory: Map<number, number> }) {
    const sortedEntries = Array.from(memory.entries()).sort((a, b) => a[0] - b[0]);

    return (
        <div className="rounded-lg bg-gray-800 p-4 shadow-lg">
            <h2 className="mb-3 text-xl font-bold text-blue-400">Memory</h2>
            {sortedEntries.length === 0 ? (
                <div className="text-sm text-gray-500">No memory locations in use</div>
            ) : (
                <div className="space-y-2">
                    {sortedEntries.map(([addr, value]) => (
                        <div key={addr} className="flex items-center justify-between rounded bg-gray-700 p-2">
                            <span className="text-sm text-gray-400">Addr {addr}</span>
                            <span className="font-mono text-lg text-green-400">{value}</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

// ROB View
function ROBView({ rob }: { rob: ROBEntry[] }) {
    return (
        <div className="rounded-lg bg-gray-800 p-4 shadow-lg">
            <h2 className="mb-3 text-xl font-bold text-blue-400">
                Reorder Buffer (ROB) <span className="text-sm text-gray-400">({rob.length} entries)</span>
            </h2>
            {rob.length === 0 ? (
                <div className="text-sm text-gray-500">ROB is empty</div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full font-mono text-sm">
                        <thead>
                            <tr className="border-b border-gray-700">
                                <th className="px-2 py-2 text-left text-gray-400">ID</th>
                                <th className="px-2 py-2 text-left text-gray-400">Instr</th>
                                <th className="px-2 py-2 text-left text-gray-400">Dest</th>
                                <th className="px-2 py-2 text-left text-gray-400">Value</th>
                                <th className="px-2 py-2 text-left text-gray-400">Ready</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rob.map((entry, idx) => (
                                <tr
                                    key={entry._id}
                                    className={`border-b border-gray-700 ${idx === 0 ? "bg-yellow-900/20" : ""}`}
                                >
                                    <td className="px-2 py-2">
                                        {idx === 0 && <span className="text-yellow-400">→ </span>}#{entry._id}
                                    </td>
                                    <td className="px-2 py-2 text-gray-300">I{entry._instrId}</td>
                                    <td className="px-2 py-2 text-blue-400">
                                        {entry.dest !== undefined ? `R${entry.dest}` : "-"}
                                    </td>
                                    <td className="px-2 py-2 text-green-400">
                                        {entry.value !== undefined ? entry.value : "-"}
                                    </td>
                                    <td className="px-2 py-2">
                                        {entry.ready ? (
                                            <span className="text-green-400">✓</span>
                                        ) : (
                                            <span className="text-gray-500">✗</span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

// Reservation Stations View
function ReservationStationsView({ stations }: { stations: Map<string, ReservationStation[]> }) {
    return (
        <div className="rounded-lg bg-gray-800 p-4 shadow-lg">
            <h2 className="mb-3 text-xl font-bold text-blue-400">Reservation Stations</h2>
            <div className="space-y-4">
                {Array.from(stations.entries()).map(([fuName, stationList]) => (
                    <div key={fuName} className="rounded bg-gray-700 p-3">
                        <h3 className="mb-2 font-bold text-green-400">{fuName}</h3>
                        <div className="space-y-2">
                            {stationList.map((station) => (
                                <div
                                    key={station.name}
                                    className={`rounded p-2 font-mono text-sm ${
                                        station.busy ? "bg-gray-600" : "bg-gray-800"
                                    }`}
                                >
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <span className="text-gray-400">{station.name}</span>
                                            {station.busy && station.op && (
                                                <span className="ml-2 text-blue-400">{station.op}</span>
                                            )}
                                        </div>
                                        {station.busy && (
                                            <span className="text-xs text-yellow-400">ROB#{station._destROBId}</span>
                                        )}
                                    </div>
                                    {station.busy && (
                                        <div className="mt-1 grid grid-cols-2 gap-2 text-xs">
                                            <div>
                                                <span className="text-gray-500">Vj:</span>{" "}
                                                <span className="text-green-400">
                                                    {station.Vj !== null && station.Vj !== undefined ? station.Vj : "-"}
                                                </span>
                                            </div>
                                            <div>
                                                <span className="text-gray-500">Qj:</span>{" "}
                                                <span className="text-purple-400">
                                                    {station.Qj !== null && station.Qj !== undefined
                                                        ? `#${station.Qj}`
                                                        : "-"}
                                                </span>
                                            </div>
                                            <div>
                                                <span className="text-gray-500">Vk:</span>{" "}
                                                <span className="text-green-400">
                                                    {station.Vk !== null && station.Vk !== undefined ? station.Vk : "-"}
                                                </span>
                                            </div>
                                            <div>
                                                <span className="text-gray-500">Qk:</span>{" "}
                                                <span className="text-purple-400">
                                                    {station.Qk !== null && station.Qk !== undefined
                                                        ? `#${station.Qk}`
                                                        : "-"}
                                                </span>
                                            </div>
                                            {station.remaining !== undefined && (
                                                <div className="col-span-2">
                                                    <span className="text-gray-500">Remaining:</span>{" "}
                                                    <span className="text-orange-400">{station.remaining}</span>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default App;
