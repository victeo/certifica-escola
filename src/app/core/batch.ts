import { writeBatch, WriteBatch } from 'firebase/firestore';
import { db } from './firebase';

const BATCH_LIMIT = 400; // limite do Firestore é 500 operações por lote

/** Executa as operações em lotes de até 400 gravações. */
export async function commitInChunks(ops: ((batch: WriteBatch) => void)[]): Promise<void> {
  for (let i = 0; i < ops.length; i += BATCH_LIMIT) {
    const batch = writeBatch(db);
    ops.slice(i, i + BATCH_LIMIT).forEach((op) => op(batch));
    await batch.commit();
  }
}
