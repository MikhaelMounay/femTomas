import type { Instruction } from "../internal/types/Instruction";
import type { ROBEntry } from "../internal/types/ROBEntry";

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
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-lg">
            <h2 className="mb-3 text-xl font-bold text-blue-600">Program Instructions</h2>
            <div className="overflow-x-auto">
                <table className="w-full font-mono text-sm">
                    <thead>
                        <tr className="border-b-2 border-gray-300">
                            <th className="px-2 py-2 text-left text-gray-600">PC</th>
                            <th className="px-2 py-2 text-left text-gray-600">Instruction</th>
                            <th className="px-2 py-2 text-left text-gray-600">Issue</th>
                            <th className="px-2 py-2 text-left text-gray-600">ExStart</th>
                            <th className="px-2 py-2 text-left text-gray-600">ExEnd</th>
                            <th className="px-2 py-2 text-left text-gray-600">Write</th>
                            <th className="px-2 py-2 text-left text-gray-600">Commit</th>
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
                                    className={`border-b border-gray-200 ${isCurrent ? "bg-blue-100" : ""} ${
                                        isFlushed ? "opacity-50" : ""
                                    }`}
                                >
                                    <td className="px-2 py-2">
                                        {isCurrent && <span className="text-amber-600">→ </span>}
                                        {idx}
                                    </td>
                                    <td className="px-2 py-2 text-gray-700">
                                        {instr._text || `${instr.type}`}
                                        {isFlushed && <span className="ml-2 text-xs text-red-600">(flushed)</span>}
                                    </td>
                                    <td className="px-2 py-2 text-green-600">{timing?.issuedCycle ?? "-"}</td>
                                    <td className="px-2 py-2 text-blue-600">{timing?.execStartCycle ?? "-"}</td>
                                    <td className="px-2 py-2 text-blue-600">{timing?.execCompleteCycle ?? "-"}</td>
                                    <td className="px-2 py-2 text-purple-600">{timing?.writeResultCycle ?? "-"}</td>
                                    <td className="px-2 py-2 text-orange-600">{timing?.commitCycle ?? "-"}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

export default ProgramView;
