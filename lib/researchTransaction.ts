type TransactionSession = {
  withTransaction<T>(work: () => Promise<T>): Promise<T>;
  endSession(): Promise<void> | void;
};

type TransactionConnection = {
  startSession(): Promise<TransactionSession>;
};

/**
 * Keep all research write-path mutations inside one MongoDB transaction.  The
 * research deployment must therefore use a transaction-capable replica set;
 * failing that, the endpoint fails closed rather than partially consuming a
 * receipt or writing an orphaned log row.
 */
export async function runResearchTransaction<T>(
  connection: TransactionConnection,
  work: (session: TransactionSession) => Promise<T>,
): Promise<T> {
  const session = await connection.startSession();
  try {
    return await session.withTransaction(() => work(session));
  } finally {
    await session.endSession();
  }
}

