import { access, copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import pixelmatch from 'pixelmatch';
import { PNG } from 'pngjs';

export interface DiffResult {
  baselineExists: boolean;
  diffPercentage: number | null;
  visualDifference: boolean;
  diffPath: string | null;
}

export async function baselineExists(baselinePath: string): Promise<boolean> {
  try {
    await access(baselinePath);
    return true;
  } catch {
    return false;
  }
}

export async function writeBaseline(currentPath: string, baselinePath: string): Promise<void> {
  await mkdir(dirname(baselinePath), { recursive: true });
  await copyFile(currentPath, baselinePath);
}

export async function compareImages(
  baselinePath: string,
  currentPath: string,
  diffPath: string,
  thresholdPercentage = 0.1,
): Promise<DiffResult> {
  if (!(await baselineExists(baselinePath))) {
    return {
      baselineExists: false,
      diffPercentage: null,
      visualDifference: false,
      diffPath: null,
    };
  }

  const [baselineBuffer, currentBuffer] = await Promise.all([
    readFile(baselinePath),
    readFile(currentPath),
  ]);
  const baseline = PNG.sync.read(baselineBuffer);
  const current = PNG.sync.read(currentBuffer);
  await mkdir(dirname(diffPath), { recursive: true });

  if (baseline.width !== current.width || baseline.height !== current.height) {
    await writeFile(diffPath, PNG.sync.write(current));
    return {
      baselineExists: true,
      diffPercentage: 100,
      visualDifference: true,
      diffPath,
    };
  }

  const diff = new PNG({ width: baseline.width, height: baseline.height });
  const differencePixels = pixelmatch(
    baseline.data,
    current.data,
    diff.data,
    baseline.width,
    baseline.height,
    { threshold: 0.1, includeAA: false },
  );
  const diffPercentage = (differencePixels / (baseline.width * baseline.height)) * 100;
  await writeFile(diffPath, PNG.sync.write(diff));

  return {
    baselineExists: true,
    diffPercentage,
    visualDifference: diffPercentage > thresholdPercentage,
    diffPath,
  };
}
