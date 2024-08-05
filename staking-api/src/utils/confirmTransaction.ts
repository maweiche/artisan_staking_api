import { Connection } from '@solana/web3.js';

const confirmTransaction = async ({
  tx,
  connection,
}: {
  tx: string;
  connection: Connection;
}): Promise<boolean> => {
  try {
    let confirmed = null;

    while (!confirmed) {
      confirmed = await connection.getTransaction(tx, {
        commitment: 'confirmed',
      });
    }

    if (confirmed.meta?.err) {
      return false;
    }

    return !!confirmed;
  } catch (_e) {
    return false;
  }
};

export { confirmTransaction };
