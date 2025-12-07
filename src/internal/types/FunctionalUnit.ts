export interface FunctionalUnit {
    name: string;
    count: number;      // number of reservation stations
    latency: number;    // execution latency in cycles (not including issue/write/commit)
}
