import type { ReservationStation } from "../internal/types/ReservationStation";

function ReservationStationsView({ stations }: { stations: Map<string, ReservationStation[]> }) {
    return (
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-lg">
            <h2 className="mb-3 text-xl font-bold text-blue-600">Reservation Stations</h2>
            <div className="space-y-4">
                {Array.from(stations.entries()).map(([fuName, stationList]) => (
                    <div key={fuName} className="rounded border border-gray-300 bg-gray-50 p-3">
                        <h3 className="mb-2 font-bold text-green-700">{fuName}</h3>
                        <div className="space-y-2">
                            {stationList.map((station) => (
                                <div
                                    key={station.name}
                                    className={`rounded border p-3 font-mono text-sm ${
                                        station.busy ? "border-blue-300 bg-blue-50" : "border-gray-200 bg-white"
                                    }`}
                                >
                                    <div className="mb-2 flex items-start justify-between">
                                        <div>
                                            <span className="font-semibold text-gray-700">{station.name}</span>
                                            {station.busy && station.op && (
                                                <span className="ml-2 font-bold text-blue-700">{station.op}</span>
                                            )}
                                        </div>
                                        {station.busy && (
                                            <span className="rounded bg-amber-200 px-2 py-1 text-xs text-amber-800">
                                                ROB#{station._destROBId}
                                            </span>
                                        )}
                                    </div>
                                    {station.busy && (
                                        <div className="space-y-2">
                                            {/* Standard operand fields */}
                                            <div className="grid grid-cols-2 gap-2 text-xs">
                                                <div>
                                                    <span className="text-gray-600">Vj:</span>{" "}
                                                    <span className="font-semibold text-green-700">
                                                        {station.Vj !== null && station.Vj !== undefined ? station.Vj : "-"}
                                                    </span>
                                                </div>
                                                <div>
                                                    <span className="text-gray-600">Qj:</span>{" "}
                                                    <span className="font-semibold text-purple-700">
                                                        {station.Qj !== null && station.Qj !== undefined
                                                            ? `#${station.Qj}`
                                                            : "-"}
                                                    </span>
                                                </div>
                                                <div>
                                                    <span className="text-gray-600">Vk:</span>{" "}
                                                    <span className="font-semibold text-green-700">
                                                        {station.Vk !== null && station.Vk !== undefined ? station.Vk : "-"}
                                                    </span>
                                                </div>
                                                <div>
                                                    <span className="text-gray-600">Qk:</span>{" "}
                                                    <span className="font-semibold text-purple-700">
                                                        {station.Qk !== null && station.Qk !== undefined
                                                            ? `#${station.Qk}`
                                                            : "-"}
                                                    </span>
                                                </div>
                                                {station.remaining !== undefined && (
                                                    <div className="col-span-2">
                                                        <span className="text-gray-600">Remaining:</span>{" "}
                                                        <span className="font-semibold text-orange-700">
                                                            {station.remaining}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Special instruction-specific fields */}
                                            {(station.offset !== undefined ||
                                                station.branchTarget !== undefined ||
                                                station.callTarget !== undefined ||
                                                station.returnAddress !== undefined ||
                                                station.computedValue !== undefined ||
                                                station.storeAddress !== undefined ||
                                                station.storeValue !== undefined ||
                                                station.branchTaken !== undefined ||
                                                station.mispredicted !== undefined) && (
                                                <div className="mt-2 border-t border-gray-300 pt-2">
                                                    <div className="mb-1 text-xs font-semibold text-gray-500">
                                                        Special Fields:
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-2 text-xs">
                                                        {station.offset !== undefined && (
                                                            <div>
                                                                <span className="text-gray-600">Offset:</span>{" "}
                                                                <span className="font-semibold text-indigo-700">
                                                                    {station.offset}
                                                                </span>
                                                            </div>
                                                        )}
                                                        {station.branchTarget !== undefined && (
                                                            <div>
                                                                <span className="text-gray-600">Branch Target:</span>{" "}
                                                                <span className="font-semibold text-indigo-700">
                                                                    {station.branchTarget}
                                                                </span>
                                                            </div>
                                                        )}
                                                        {station.callTarget !== undefined && (
                                                            <div>
                                                                <span className="text-gray-600">Call Target:</span>{" "}
                                                                <span className="font-semibold text-indigo-700">
                                                                    {station.callTarget}
                                                                </span>
                                                            </div>
                                                        )}
                                                        {station.returnAddress !== undefined && (
                                                            <div>
                                                                <span className="text-gray-600">Return Addr:</span>{" "}
                                                                <span className="font-semibold text-indigo-700">
                                                                    {station.returnAddress}
                                                                </span>
                                                            </div>
                                                        )}
                                                        {station.computedValue !== undefined && (
                                                            <div>
                                                                <span className="text-gray-600">Computed:</span>{" "}
                                                                <span className="font-semibold text-emerald-700">
                                                                    {station.computedValue}
                                                                </span>
                                                            </div>
                                                        )}
                                                        {station.storeAddress !== undefined && (
                                                            <div>
                                                                <span className="text-gray-600">Store Addr:</span>{" "}
                                                                <span className="font-semibold text-rose-700">
                                                                    {station.storeAddress}
                                                                </span>
                                                            </div>
                                                        )}
                                                        {station.storeValue !== undefined && (
                                                            <div>
                                                                <span className="text-gray-600">Store Value:</span>{" "}
                                                                <span className="font-semibold text-rose-700">
                                                                    {station.storeValue}
                                                                </span>
                                                            </div>
                                                        )}
                                                        {station.branchTaken !== undefined && (
                                                            <div>
                                                                <span className="text-gray-600">Branch Taken:</span>{" "}
                                                                <span
                                                                    className={`font-semibold ${station.branchTaken ? "text-green-700" : "text-red-700"}`}
                                                                >
                                                                    {station.branchTaken ? "Yes" : "No"}
                                                                </span>
                                                            </div>
                                                        )}
                                                        {station.mispredicted !== undefined && (
                                                            <div>
                                                                <span className="text-gray-600">Mispredicted:</span>{" "}
                                                                <span
                                                                    className={`font-semibold ${station.mispredicted ? "text-red-700" : "text-green-700"}`}
                                                                >
                                                                    {station.mispredicted ? "Yes" : "No"}
                                                                </span>
                                                            </div>
                                                        )}
                                                    </div>
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

export default ReservationStationsView;
