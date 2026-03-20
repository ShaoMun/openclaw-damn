"use client";

import { useStore } from "@/lib/store";
import {
  Shield,
  Check,
  ExternalLink,
  Copy,
  Hash,
  Clock,
  FileCheck,
} from "lucide-react";
import {
  truncateHash,
  formatProofTime,
  getProofIdentifier,
} from "@/lib/zkml-utils";
import { useState } from "react";

export function ZKMLVerificationPanel() {
  const zkmlProofs = useStore((s) => s.zkmlProofs);
  const showZKMLVerification = useStore((s) => s.showZKMLVerification);
  const toggleZKMLVerification = useStore((s) => s.toggleZKMLVerification);
  const [copiedHash, setCopiedHash] = useState<string | null>(null);

  if (!showZKMLVerification) return null;

  const handleCopyHash = (hash: string) => {
    navigator.clipboard.writeText(hash);
    setCopiedHash(hash);
    setTimeout(() => setCopiedHash(null), 2000);
  };

  return (
    <div className="absolute bottom-4 left-4 w-80 bg-black/40 backdrop-blur-md border border-white/20 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-500/10 to-blue-500/10 px-4 py-2 border-b border-white/20 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="w-3.5 h-3.5 text-purple-400" />
          <span className="text-sm font-medium text-white">ZKML Proofs</span>
          <div className="px-1.5 py-0.5 bg-green-500/20 border border-green-500/30 rounded text-[9px] font-mono text-green-400">
            VERIFIED
          </div>
        </div>
        <button
          onClick={toggleZKMLVerification}
          className="text-white/60 hover:text-white transition-colors"
        >
          ✕
        </button>
      </div>

      {/* Description */}
      <div className="px-4 py-3 border-b border-white/10">
        <p className="text-[10px] text-white/60 leading-relaxed">
          Cryptographic proofs verify AI outputs are from the correct model,
          preventing injection attacks.
        </p>
      </div>

      {/* Proofs List */}
      <div className="max-h-96 overflow-y-auto scrollbar-thin">
        {zkmlProofs.length === 0 ? (
          <div className="p-6 text-center">
            <FileCheck className="w-8 h-8 text-white/20 mx-auto mb-2" />
            <p className="text-[10px] font-mono text-white/40">
              No proofs generated yet
            </p>
            <p className="text-[9px] text-white/20 mt-1">
              Proofs will appear when AI Commander is active
            </p>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {zkmlProofs.map((proof) => (
              <div
                key={proof.id}
                className="p-3 hover:bg-white/[0.02] transition-colors"
              >
                {/* Proof Header */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-green-400" />
                    <span className="text-[10px] font-mono text-white/80">
                      {getProofIdentifier(proof)}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-white/40">
                    <Clock className="w-3 h-3" />
                    <span className="text-[9px] font-mono">
                      {formatProofTime(proof.timestamp)}
                    </span>
                  </div>
                </div>

                {/* Model Hash */}
                <div className="mb-2">
                  <div className="flex items-center gap-1 mb-1">
                    <Hash className="w-3 h-3 text-purple-400" />
                    <span className="text-[8px] font-mono text-white/40 uppercase">
                      Model
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <code className="text-[9px] font-mono text-white/60 flex-1 truncate">
                      {proof.modelHash}
                    </code>
                  </div>
                </div>

                {/* Reasoning Hash */}
                <div className="mb-2">
                  <div className="flex items-center gap-1 mb-1">
                    <Hash className="w-3 h-3 text-blue-400" />
                    <span className="text-[8px] font-mono text-white/40 uppercase">
                      Output Hash
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <code className="text-[9px] font-mono text-white/60 flex-1 truncate">
                      {truncateHash(proof.reasoningHash)}
                    </code>
                    <button
                      onClick={() => handleCopyHash(proof.reasoningHash)}
                      className="p-1 hover:bg-white/10 rounded transition-colors"
                      title="Copy hash"
                    >
                      <Copy
                        className={`w-3 h-3 ${
                          copiedHash === proof.reasoningHash
                            ? "text-green-400"
                            : "text-white/40"
                        }`}
                      />
                    </button>
                  </div>
                </div>

                {/* Arbitrum Link */}
                <div>
                  <a
                    href={proof.verificationUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-2 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 rounded transition-all text-[9px] font-mono text-white/70 hover:text-white"
                  >
                    <span className="flex-1">View on Arbitrum</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>

                {/* Proof Visualization (Mini) */}
                <div className="mt-2 p-2 bg-black/40 rounded border border-white/5">
                  <div className="text-[8px] font-mono text-white/30 uppercase mb-1">
                    zk-SNARK Proof
                  </div>
                  <code className="text-[8px] font-mono text-white/50 break-all">
                    {truncateHash(proof.proofData.proof, 20, 10)}
                  </code>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-2 bg-white/[0.02] border-t border-white/5 flex items-center justify-between">
        <span className="text-[8px] font-mono text-white/20">
          {zkmlProofs.length} proof{zkmlProofs.length !== 1 ? "s" : ""}
        </span>
        <div className="flex items-center gap-1.5 px-2 py-0.5 bg-purple-500/5 border border-purple-500/10 rounded-sm">
          <div className="w-1 h-1 rounded-full bg-purple-400 animate-pulse" />
          <span className="text-[7px] font-mono text-purple-400/70">ZKML</span>
        </div>
      </div>
    </div>
  );
}
