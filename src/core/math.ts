export function entropy(probabilities: readonly number[]): number {
  return probabilities.reduce((sum, p) => sum - (p > 0 ? p * Math.log(p) : 0), 0);
}

export function binaryEntropy(p: number): number {
  return entropy([p, 1 - p]);
}

export function logSumExp(logs: readonly number[]): number {
  const max = Math.max(...logs);
  if (max === -Infinity) return -Infinity;
  return max + Math.log(logs.reduce((sum, v) => sum + Math.exp(v - max), 0));
}

export function softmax(logits: readonly number[]): number[] {
  const logZ = logSumExp(logits);
  if (!Number.isFinite(logZ)) throw new Error("No finite probability mass");
  return logits.map((v) => Math.exp(v - logZ));
}

export function kl(p: readonly number[], q: readonly number[]): number {
  if (p.length !== q.length) throw new Error("KL distributions must have equal dimensions");
  return p.reduce((sum, v, i) => {
    if (v === 0) return sum;
    const base = q[i];
    if (base === undefined || base <= 0) return Infinity;
    return sum + v * Math.log(v / base);
  }, 0);
}
