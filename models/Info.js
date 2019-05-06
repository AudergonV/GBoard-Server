function Info() {
    this.cpu = { model: "Unknown", count: 1, usage: 0.0, };
    this.memory = {};
    this.hostname = "Unknown";
    this.upsince = 0;
    this.memory = { totalMemMb: 0.0, usedMemMb: 0.0, freeMemMb: 0.0, freeMemPercentage: 0.0 };
    this.os = "Unknown";
    this.disk = { totalGb: 0.0, usedGb: 0.0, freeGb: 0.0, usedPercentage: 0.0, freePercentage: 0.0 };
    this.network = {
        total: {
            inputMb: 0,
            outputMb: 0.01
        },
        ens1f0: {
            inputMb: 0,
            outputMb: 0.01
        }
    }
}

module.exports = Info;