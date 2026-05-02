import { 
  TransactionBuilder, 
  xdr,
  Address,
  rpc,
  Contract,
  nativeToScVal,
  Transaction
} from '@stellar/stellar-sdk';
import { signTransaction as freighterSignTransaction } from '@stellar/freighter-api';
import { CONTRACT_ID, RPC_URL, NETWORK_PASSPHRASE } from '../contracts/config';

const server = new rpc.Server(RPC_URL);
const DEFAULT_SIM_ACCOUNT = 'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF';
const XLM_CONTRACT_ID = 'CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC';

async function signWithFreighter(txXdr: string): Promise<string> {
  let attempts = 0;
  const maxAttempts = 3;

  while (attempts < maxAttempts) {
    try {
      const response = await freighterSignTransaction(txXdr, {
        networkPassphrase: NETWORK_PASSPHRASE,
      });
      if (!response || response.error || !response.signedTxXdr) {
        throw new Error(response?.error || 'Freighter error');
      }
      return response.signedTxXdr;
    } catch (e: any) {
      const msg = e?.message || String(e);
      // If it's a connection error, wait a bit and retry
      if (msg.includes('Could not establish connection') && attempts < maxAttempts - 1) {
        attempts++;
        await new Promise(r => setTimeout(r, 500 * attempts));
        continue;
      }
      throw e;
    }
  }
  throw new Error('Failed to sign transaction after multiple attempts');
}

function hexToBytes32(hex: string): xdr.ScVal {
  const normalized = hex.trim().toLowerCase();
  if (!/^[a-f0-9]{64}$/.test(normalized)) {
    throw new Error('Document hash must be a valid 64-char SHA-256 hex.');
  }
  const bytes = new Uint8Array(normalized.match(/.{1,2}/g)!.map((byte) => parseInt(byte, 16)));
  return nativeToScVal(bytes, { type: 'bytes' });
}

async function executeContractCall(publicKey: string, method: string, args: xdr.ScVal[]) {
  const account = await server.getAccount(publicKey);
  const contract = new Contract(CONTRACT_ID);
  
  // Use a slightly higher fee to ensure priority during congested times
  const tx = new TransactionBuilder(account, {
    fee: '5000', 
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(contract.call(method, ...args))
    .setTimeout(60)
    .build();

  const prepared = await server.prepareTransaction(tx);
  
  // Add a small breather before triggering Freighter to avoid rapid-fire issues
  await new Promise(r => setTimeout(r, 300));
  
  const signedTxXdr = await signWithFreighter(prepared.toXDR());
  const signedTx = new Transaction(signedTxXdr, NETWORK_PASSPHRASE);
  const sendResponse = await server.sendTransaction(signedTx);
  
  if (sendResponse.status === 'PENDING') {
    let statusResponse = await server.getTransaction(sendResponse.hash);
    let polls = 0;
    while (statusResponse.status !== 'SUCCESS' && statusResponse.status !== 'FAILED' && polls < 30) {
      await new Promise(r => setTimeout(r, 1500));
      statusResponse = await server.getTransaction(sendResponse.hash);
      polls++;
    }
    if (statusResponse.status === 'FAILED') {
      throw new Error('Transaction failed on chain');
    }
    if (polls >= 30) {
      throw new Error('Transaction timeout (still pending)');
    }
    return sendResponse.hash;
  }
  throw new Error(`Transaction failed with status: ${sendResponse.status}`);
}

export async function registerCertificateOnChain(publicKey: string, hash: string, employer: string, institution: string) {
  const hashScVal = hexToBytes32(hash);
  const studentScVal = new Address(publicKey).toScVal();
  const employerScVal = new Address(employer).toScVal();
  const institutionScVal = new Address(institution).toScVal();

  // Different deployed contracts may expose different register signatures.
  // Try common variants in order, only falling back on arity mismatch.
  const attempts: Array<{ method: string; args: xdr.ScVal[] }> = [
    // register(user, hash) for contracts exposing the basic ABI
    { method: 'register', args: [studentScVal, hashScVal] },
    // register_certificate(hash, student, employer, institution)
    { method: 'register_certificate', args: [hashScVal, studentScVal, employerScVal, institutionScVal] },
    // register_certificate(hash, employer, institution)
    { method: 'register_certificate', args: [hashScVal, employerScVal, institutionScVal] },
    // register_certificate(hash, student)
    { method: 'register_certificate', args: [hashScVal, studentScVal] },
    // register_certificate(student, hash)
    { method: 'register_certificate', args: [studentScVal, hashScVal] },
  ];

  let lastError: unknown;
  for (const attempt of attempts) {
    try {
      return await executeContractCall(publicKey, attempt.method, attempt.args);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      lastError = e;
      const isParamMismatch =
        msg.includes('MismatchingParameterLen') ||
        msg.includes('UnexpectedSize') ||
        msg.includes('MissingValue') ||
        msg.includes('non-existent contract function') ||
        msg.includes('InvalidAction') ||
        msg.includes('UnknownError');
      if (!isParamMismatch) throw e;
    }
  }

  throw lastError instanceof Error ? lastError : new Error('Unable to register credential on this contract.');
}

export async function signCertificateOnChain(publicKey: string, hash: string) {
  const hashScVal = hexToBytes32(hash);
  const signerScVal = new Address(publicKey).toScVal();
  const attempts: Array<{ method: string; args: xdr.ScVal[] }> = [
    { method: 'sign_certificate', args: [hashScVal, signerScVal] },
    { method: 'sign_certificate', args: [signerScVal, hashScVal] },
    { method: 'sign_certificate', args: [hashScVal] },
    { method: 'sign', args: [hashScVal, signerScVal] },
    { method: 'sign', args: [hashScVal] },
    { method: 'endorse_certificate', args: [hashScVal, signerScVal] },
    { method: 'approve_certificate', args: [hashScVal, signerScVal] },
  ];

  let lastError: unknown;
  for (const attempt of attempts) {
    try {
      return await executeContractCall(publicKey, attempt.method, attempt.args);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      lastError = e;
      const isAbiMismatch =
        msg.includes('MismatchingParameterLen') ||
        msg.includes('UnexpectedSize') ||
        msg.includes('MissingValue') ||
        msg.includes('non-existent contract function') ||
        msg.includes('InvalidAction') ||
        msg.includes('UnknownError');
      if (!isAbiMismatch) throw e;
    }
  }

  throw lastError instanceof Error
    ? new Error(`Contract does not expose a compatible signing function. Last error: ${lastError.message}`)
    : new Error('Contract does not expose a compatible signing function.');
}

export async function getCertificateStatus(hash: string): Promise<{ employer_signed: boolean; institution_signed: boolean } | null> {
  const source = await server.getAccount(DEFAULT_SIM_ACCOUNT);
  const contract = new Contract(CONTRACT_ID);
  const hashScVal = hexToBytes32(hash);
  const methods = ['get_certificate', 'verify'];

  for (const method of methods) {
    try {
      const tx = new TransactionBuilder(source, { fee: '100', networkPassphrase: NETWORK_PASSPHRASE })
        .addOperation(contract.call(method, hashScVal))
        .setTimeout(30)
        .build();

      const sim = await server.simulateTransaction(tx);
      const simResult = (sim as { result?: { retval?: xdr.ScVal } }).result;
      if (!simResult?.retval) continue;

      const val = simResult.retval;
      if (val.switch().name === 'scvMap') {
        const map = val.map() || [];
        const findBool = (key: string) => {
          const entry = map.find((m) => m.key().switch().name === 'scvSymbol' && m.key().sym().toString() === key);
          const v = entry?.val();
          return v?.switch().name === 'scvBool' ? v.b() : false;
        };

        return {
          employer_signed: findBool('employer_signed'),
          institution_signed: findBool('institution_signed'),
        };
      }

      // Basic ABI verify(hash) returns optional address/identifier when exists.
      if (val.switch().name === 'scvAddress' || val.switch().name === 'scvVec' || val.switch().name === 'scvBytes') {
        return { employer_signed: true, institution_signed: false };
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      const isAbiMismatch =
        msg.includes('non-existent contract function') ||
        msg.includes('MissingValue') ||
        msg.includes('MismatchingParameterLen') ||
        msg.includes('InvalidAction');
      if (!isAbiMismatch) throw e;
    }
  }

  return null;
}

export async function submitLinkPayment(publicKey: string, to: string, amount: number) {
  const argsLink = [
    new Address(XLM_CONTRACT_ID).toScVal(),
    new Address(publicKey).toScVal(),
    new Address(to).toScVal(),
    nativeToScVal(BigInt(amount) * BigInt(10000000), { type: 'i128' })
  ];

  const argsPayReward = [
    new Address(XLM_CONTRACT_ID).toScVal(),
    new Address(publicKey).toScVal(),
    new Address(to).toScVal(),
    nativeToScVal(BigInt(amount) * BigInt(10000000), { type: 'i128' })
  ];

  try {
    return await executeContractCall(publicKey, 'link_payment', argsLink);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const isLinkMissing = msg.includes('non-existent contract function') || msg.includes('MissingValue');
    if (!isLinkMissing) throw e;
    return executeContractCall(publicKey, 'pay_reward', argsPayReward);
  }
}
