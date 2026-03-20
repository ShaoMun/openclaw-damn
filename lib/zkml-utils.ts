import SHA256 from "crypto-js/sha256";
import { ZKMLProof } from "./store";

// ─── Configuration ────────────────────────────────────────────────────────────

const MOCK_ARBITRUM_TX_HASH = "0x8f2d3a1b4c5e6d7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f";
const ARBITRUM_EXPLORER_URL = "https://arbiscan.io/tx";
const MODEL_HASH = "mistral-small-latest-v2";

// ─── Mock ZK-SNARK Proof Generation ────────────────────────────────────────────

function generateMockZKSNARK(): string {
  // Generate a mock zk-SNARK proof (128 hex bytes = 256 hex chars)
  const chars = "0123456789abcdef";
  let proof = "";
  for (let i = 0; i < 256; i++) {
    proof += chars[Math.floor(Math.random() * chars.length)];
  }
  return "0x" + proof;
}

function generateMockPublicInputs(): string[] {
  // Mock public inputs for the proof
  return [
    "0x" + Math.random().toString(16).substr(2, 64),
    "0x" + Math.random().toString(16).substr(2, 64),
  ];
}

// ─── Proof Generation ───────────────────────────────────────────────────────────

/**
 * Generate a ZKML proof for AI reasoning output
 *
 * This creates a cryptographic commitment to the AI reasoning,
 * demonstrating that the output was produced by the correct model.
 *
 * @param reasoning - The AI reasoning text to hash
 * @param timestamp - Optional timestamp (defaults to current time)
 * @returns A ZKML proof object
 */
export async function generateZKMLProof(
  reasoning: string,
  timestamp: number = Date.now()
): Promise<ZKMLProof> {
  // Hash the reasoning text (input commitment)
  const reasoningHash = SHA256(reasoning + timestamp).toString();

  // Create model commitment
  const modelCommitment = SHA256(MODEL_HASH + reasoningHash).toString();

  // Create output commitment
  const outputCommitment = SHA256(reasoningHash + timestamp.toString()).toString();

  // Generate mock zk-SNARK proof
  const proof = generateMockZKSNARK();

  // Generate mock public inputs
  const publicInputs = generateMockPublicInputs();

  // Construct verification URL
  const verificationUrl = `${ARBITRUM_EXPLORER_URL}/${MOCK_ARBITRUM_TX_HASH}`;

  return {
    id: "", // Will be set by store
    timestamp,
    reasoningHash,
    modelHash: MODEL_HASH,
    arbitrumTxHash: MOCK_ARBITRUM_TX_HASH,
    verificationUrl,
    verified: true, // Mock: always verified
    proofData: {
      inputCommitment: modelCommitment,
      outputCommitment,
      proof,
      publicInputs,
    },
  };
}

// ─── Proof Verification (Mock) ─────────────────────────────────────────────────

/**
 * Verify a ZKML proof
 *
 * In a real implementation, this would verify the zk-SNARK proof
 * against the commitment. For this mock, we always return true.
 *
 * @param proof - The proof to verify
 * @returns Always true (mock implementation)
 */
export function verifyZKMLProof(proof: ZKMLProof): boolean {
  // Mock verification - always return true
  // In a real implementation, this would:
  // 1. Parse the zk-SNARK proof
  // 2. Verify against the commitment
  // 3. Check the Arbitrum transaction
  return proof.verified;
}

// ─── Utility Functions ─────────────────────────────────────────────────────────

/**
 * Truncate a hash for display
 *
 * @param hash - The hash to truncate
 * @param startChars - Number of characters to keep at start
 * @param endChars - Number of characters to keep at end
 * @returns Truncated hash string
 */
export function truncateHash(
  hash: string,
  startChars: number = 10,
  endChars: number = 8
): string {
  if (hash.length <= startChars + endChars) return hash;
  return `${hash.slice(0, startChars)}...${hash.slice(-endChars)}`;
}

/**
 * Format a timestamp for display
 *
 * @param timestamp - Unix timestamp in milliseconds
 * @returns Formatted time string
 */
export function formatProofTime(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString("en-US", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

/**
 * Generate a human-readable proof ID
 *
 * @param proof - The proof object
 * @returns A readable identifier
 */
export function getProofIdentifier(proof: ZKMLProof): string {
  const date = new Date(proof.timestamp);
  const time = date.toLocaleTimeString("en-US", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
  });
  return `Proof-${time}`;
}
