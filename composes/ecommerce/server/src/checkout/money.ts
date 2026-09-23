// Minor<->major boundary conversions. The sagas hold integer minor
// units end to end; the ledger createJournal contract takes major
// units and converts back via toMinorUnits (round-trip exact for
// 2-decimal currencies). Kept local so compose code never imports
// module internals; parity with the ledger helpers is locked by tests.
export function toMajorUnits(minorAmount: number): number {
  return minorAmount / 100
}
