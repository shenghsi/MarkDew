import { readFileSync } from 'node:fs';

const records = readFileSync(process.argv[2], 'utf8').split('\n')
  .filter(line => line.startsWith('{"benchmark"')).map(JSON.parse);
const median = values => {
  const sorted = [...values].sort((a, b) => a - b), middle = sorted.length >> 1;
  return +(sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2).toFixed(3);
};
console.log(JSON.stringify(records.map(record => ({
  bytes: record.bytes, note: record.note, location: record.location,
  total: { median: record.median, p95: record.p95 },
  stages: record.stageSamples ? Object.fromEntries(Object.keys(record.stageSamples[0]).map(name => [name, {
    medianMs: median(record.stageSamples.map(sample => sample[name].ms)),
    medianCalls: median(record.stageSamples.map(sample => sample[name].calls)),
  }])) : undefined,
})), null, 2));
