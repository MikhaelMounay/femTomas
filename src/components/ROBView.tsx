import type { ROBEntry } from "../internal/types/ROBEntry";

function ROBView({ rob }: { rob: ROBEntry[] }) {
    return (
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-lg">
            <h2 className="mb-3 text-xl font-bold text-blue-600">
                Reorder Buffer (ROB) <span className="text-sm text-gray-600">({rob.length} entries)</span>
            </h2>
            {rob.length === 0 ? (
                <div className="text-sm text-gray-500">ROB is empty</div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full font-mono text-sm">
                        <thead>
                            <tr className="border-b-2 border-gray-300">
                                <th className="px-2 py-2 text-left text-gray-600">ID</th>
                                <th className="px-2 py-2 text-left text-gray-600">Instr</th>
                                <th className="px-2 py-2 text-left text-gray-600">Dest</th>
                                <th className="px-2 py-2 text-left text-gray-600">Value</th>
                                <th className="px-2 py-2 text-left text-gray-600">Ready</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rob.map((entry, idx) => (
                                <tr key={entry._id} className={`border-b border-gray-200 ${idx === 0 ? "bg-amber-50" : ""}`}>
                                    <td className="px-2 py-2">
                                        {idx === 0 && <span className="text-amber-600">→ </span>}#{entry._id}
                                    </td>
                                    <td className="px-2 py-2 text-gray-700">I{entry._instrId}</td>
                                    <td className="px-2 py-2 text-blue-600">
                                        {entry.dest !== undefined ? `R${entry.dest}` : "-"}
                                    </td>
                                    <td className="px-2 py-2 text-green-600">
                                        {entry.value !== undefined ? entry.value : "-"}
                                    </td>
                                    <td className="px-2 py-2">
                                        {entry.ready ? (
                                            <span className="text-green-600">✓</span>
                                        ) : (
                                            <span className="text-gray-400">✗</span>
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

export default ROBView;
