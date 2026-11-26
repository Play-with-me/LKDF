function cryptoUnitFloat(): number {
  const cryptoApi = globalThis.crypto;
  if (cryptoApi?.getRandomValues) {
    const arr = new Uint32Array(1);
    cryptoApi.getRandomValues(arr);
    return (arr[0] ?? 0) / 0x1_0000_0000;
  }
  return Math.random();
}

function fisherYatesPass<T>(arr: T[], rand: () => number, reverseOrder = false): void {
  if (reverseOrder) {
    for (let i = 0; i < arr.length - 1; i += 1) {
      const j = i + Math.floor(rand() * (arr.length - i));
      const tmp = arr[i]!;
      arr[i] = arr[j]!;
      arr[j] = tmp;
    }
    return;
  }
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1));
    const current = arr[i];
    const swap = arr[j];
    if (current !== undefined && swap !== undefined) {
      arr[i] = swap;
      arr[j] = current;
    }
  }
}

/**
 * Trộn mảng bất biến:
 * - Khi dùng bộ ngẫu nhiên mặc định (`rng === Math.random`), dùng `crypto.getRandomValues`
 *   với 3 lượt trộn sâu (Fisher-Yates -> Cắt & Xào kẹp -> Fisher-Yates đảo chiều).
 * - Khi truyền `rng` cố định (kiểm thử đơn vị), giữ Fisher-Yates tất định theo seed.
 */
export function shuffleArray<T>(
  items: readonly T[],
  rng: () => number = Math.random,
): T[] {
  const copy = [...items];
  if (copy.length <= 1) {
    return copy;
  }
  if (rng !== Math.random) {
    fisherYatesPass(copy, rng, false);
    return copy;
  }

  fisherYatesPass(copy, cryptoUnitFloat, false);

  const split = Math.floor(copy.length / 2);
  let leftIdx = 0;
  let rightIdx = split;
  const riffled: T[] = [];
  while (leftIdx < split && rightIdx < copy.length) {
    if (cryptoUnitFloat() < 0.5) {
      riffled.push(copy[leftIdx++]!);
    } else {
      riffled.push(copy[rightIdx++]!);
    }
  }
  while (leftIdx < split) riffled.push(copy[leftIdx++]!);
  while (rightIdx < copy.length) riffled.push(copy[rightIdx++]!);
  const cut = Math.floor(cryptoUnitFloat() * riffled.length);
  const cutRotated = [...riffled.slice(cut), ...riffled.slice(0, cut)];

  fisherYatesPass(cutRotated, cryptoUnitFloat, true);
  return cutRotated;
}
