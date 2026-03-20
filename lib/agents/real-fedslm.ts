/**
 * REAL FEDSLM Integration
 *
 * Actual integration with Ollama for running local SLM instances
 * per drone. Each drone gets its own isolated FEDSLM instance.
 */

import { spawn, ChildProcess } from "child_process";
import { createInterface, Interface } from "readline";
import { v4 as uuidv4 } from "uuid";

// ─────────────────────────────────────────────────────────────────────────────────
// Real FEDSLM Instance
// ─────────────────────────────────────────────────────────────────────────────────

export class RealFEDSLMInstance {
  private droneId: string;
  private port: number;
  private model: string;
  private process: ChildProcess | null;
  private apiUrl: string;
  private isRunning: boolean;

  constructor(droneId: string, port: number, model: string = "fedslm-model") {
    this.droneId = droneId;
    this.port = port;
    this.model = model;
    this.process = null;
    this.apiUrl = `http://localhost:${this.port}`;
    this.isRunning = false;
  }

  // Start the FEDSLM instance (Ollama)
  async start(): Promise<void> {
    if (this.isRunning) {
      console.log(`⚠️  [${this.droneId}] FEDSLM already running on port ${this.port}`);
      return;
    }

    console.log(`🚀 [${this.droneId}] Starting FEDSLM instance on port ${this.port}...`);

    return new Promise((resolve, reject) => {
      // Spawn Ollama process
      this.process = spawn("ollama", ["serve", "--port", this.port.toString()], {
        env: {
          ...process.env,
          OLLAMA_MODELS: `ollama/${this.model}`,
        },
      });

      this.process.stdout.on("data", (data) => {
        const output = data.toString().trim();
        if (output) {
          console.log(`📤 [${this.droneId}] Ollama: ${output}`);
        }
      });

      this.process.stderr.on("data", (data) => {
        const error = data.toString().trim();
        if (error) {
          console.error(`❌ [${this.droneId}] Ollama error: ${error}`);
        }
      });

      this.process.on("error", (error) => {
        console.error(`❌ [${this.droneId}] Failed to start Ollama:`, error);
        reject(error);
      });

      this.process.on("close", (code) => {
        console.log(`✅ [${this.droneId}] Ollama process exited (code: ${code})`);
        this.isRunning = false;
      });

      // Wait for server to be ready
      this.waitForServer()
        .then(() => {
          this.isRunning = true;
          console.log(`✅ [${this.droneId}] FEDSLM instance ready at ${this.apiUrl}`);
          resolve();
        })
        .catch((error) => {
          reject(error);
        });
    });
  }

  // Wait for Ollama server to be ready
  private async waitForServer(timeout: number = 30000): Promise<void> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      try {
        const response = await fetch(`${this.apiUrl}/api/tags`);
        if (response.ok) {
          console.log(`✅ [${this.droneId}] Ollama server ready`);
          return;
        }
      } catch (error) {
        // Server not ready yet, wait and retry
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }

    throw new Error(`Ollama server not ready after ${timeout}ms`);
  }

  // Stop the FEDSLM instance
  async stop(): Promise<void> {
    if (!this.isRunning || !this.process) {
      return;
    }

    console.log(`🛑 [${this.droneId}] Stopping FEDSLM instance...`);

    return new Promise((resolve) => {
      if (this.process) {
        this.process.kill("SIGTERM");
        this.process.on("close", () => {
          this.isRunning = false;
          console.log(`✅ [${this.droneId}] FEDSLM instance stopped`);
          resolve();
        });

        // Force kill after 5 seconds
        setTimeout(() => {
          if (this.process) {
            this.process.kill("SIGKILL");
          }
          resolve();
        }, 5000);
      } else {
        resolve();
      }
    });
  }

  // Pull the model (first time setup)
  async pullModel(): Promise<void> {
    console.log(`📥 [${this.droneId}] Pulling model ${this.model}...`);

    return new Promise((resolve, reject) => {
      const pullProcess = spawn("ollama", ["pull", this.model]);

      pullProcess.stdout.on("data", (data) => {
        const output = data.toString().trim();
        if (output) {
          console.log(`📤 [${this.droneId}] Ollama pull: ${output}`);
        }
      });

      pullProcess.stderr.on("data", (data) => {
        const error = data.toString().trim();
        if (error) {
          console.error(`❌ [${this.droneId}] Pull error: ${error}`);
        }
      });

      pullProcess.on("close", (code) => {
        if (code === 0) {
          console.log(`✅ [${this.droneId}] Model pulled successfully`);
          resolve();
        } else {
          reject(new Error(`Model pull failed with code ${code}`));
        }
      });
    });
  }

  // Query the FEDSLM
  async query(prompt: string): Promise<string> {
    if (!this.isRunning) {
      throw new Error(`FEDSLM instance not running for ${this.droneId}`);
    }

    console.log(`🧠 [${this.droneId}] Querying FEDSLM...`);

    try {
      const response = await fetch(`${this.apiUrl}/api/generate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: this.model,
          prompt: prompt,
          stream: false,
        }),
      });

      if (!response.ok) {
        throw new Error(`FEDSLM query failed: ${response.statusText}`);
      }

      const data = await response.json();
      const responseText = data.response;

      console.log(`✅ [${this.droneId}] FEDSLM response received`);

      return responseText;
    } catch (error) {
      console.error(`❌ [${this.droneId}] FEDSLM query error:`, error);
      throw error;
    }
  }

  // Query with streaming
  async *queryStream(prompt: string): AsyncGenerator<string> {
    if (!this.isRunning) {
      throw new Error(`FEDSLM instance not running for ${this.droneId}`);
    }

    console.log(`🧠 [${this.droneId}] Querying FEDSLM (streaming)...`);

    try {
      const response = await fetch(`${this.apiUrl}/api/generate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: this.model,
          prompt: prompt,
          stream: true,
        }),
      });

      if (!response.ok) {
        throw new Error(`FEDSLM query failed: ${response.statusText}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error("No response body");
      }

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();

        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.trim() === "") continue;

          try {
            const data = JSON.parse(line);
            if (data.response) {
              yield data.response;
            }
          } catch (e) {
            // Skip non-JSON lines
          }
        }
      }

      console.log(`✅ [${this.droneId}] FEDSLM streaming complete`);
    } catch (error) {
      console.error(`❌ [${this.droneId}] FEDSLM streaming error:`, error);
      throw error;
    }
  }

  // Check if instance is running
  isActive(): boolean {
    return this.isRunning;
  }

  // Get instance info
  getInstanceInfo() {
    return {
      droneId: this.droneId,
      port: this.port,
      model: this.model,
      apiUrl: this.apiUrl,
      isRunning: this.isRunning,
    };
  }
}

// ─────────────────────────────────────────────────────────────────────────────────
// FEDSLM Pool Manager (manages multiple instances)
// ─────────────────────────────────────────────────────────────────────────────────

export class FEDSLMPoolManager {
  private instances: Map<string, RealFEDSLMInstance>;

  constructor() {
    this.instances = new Map();
  }

  // Create a new FEDSLM instance for a drone
  async createInstance(
    droneId: string,
    port: number,
    model: string = "fedslm-model"
  ): Promise<RealFEDSLMInstance> {
    if (this.instances.has(droneId)) {
      console.log(`⚠️  FEDSLM instance already exists for ${droneId}`);
      return this.instances.get(droneId)!;
    }

    console.log(`🔧 Creating FEDSLM instance for ${droneId} on port ${port}...`);

    const instance = new RealFEDSLMInstance(droneId, port, model);
    this.instances.set(droneId, instance);

    try {
      // Pull the model first
      await instance.pullModel();

      // Start the instance
      await instance.start();

      return instance;
    } catch (error) {
      this.instances.delete(droneId);
      throw error;
    }
  }

  // Get an instance
  getInstance(droneId: string): RealFEDSLMInstance | undefined {
    return this.instances.get(droneId);
  }

  // Stop an instance
  async stopInstance(droneId: string): Promise<void> {
    const instance = this.instances.get(droneId);
    if (instance) {
      await instance.stop();
      this.instances.delete(droneId);
    }
  }

  // Stop all instances
  async stopAll(): Promise<void> {
    const stopPromises = Array.from(this.instances.keys()).map((id) =>
      this.stopInstance(id)
    );

    await Promise.all(stopPromises);
    console.log("✅ All FEDSLM instances stopped");
  }

  // Get all active instances
  getActiveInstances(): string[] {
    return Array.from(this.instances.keys()).filter(
      (id) => this.instances.get(id)?.isActive()
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────────
// Ollama Setup Helper
// ─────────────────────────────────────────────────────────────────────────────────

export class OllamaSetup {
  // Check if Ollama is installed
  static async checkInstallation(): Promise<boolean> {
    try {
      const { spawn } = require("child_process");

      return new Promise((resolve) => {
        const process = spawn("ollama", ["--version"]);
        process.on("close", (code) => {
          resolve(code === 0);
        });
        process.on("error", () => {
          resolve(false);
        });
      });
    } catch (error) {
      return false;
    }
  }

  // Install Ollama (macOS/Linux)
  static async installOllama(): Promise<void> {
    console.log("Installing Ollama...");

    const { spawn } = require("child_process");

    return new Promise((resolve, reject) => {
      const process = spawn("curl", [
        "-fsSL",
        "https://ollama.com/install.sh",
        "|",
        "sh",
      ]);

      process.stdout.on("data", (data) => {
        console.log(data.toString());
      });

      process.stderr.on("data", (data) => {
        console.error(data.toString());
      });

      process.on("close", (code) => {
        if (code === 0) {
          console.log("✅ Ollama installed successfully");
          resolve();
        } else {
          reject(new Error(`Ollama installation failed with code ${code}`));
        }
      });
    });
  }

  // Pull a model
  static async pullModel(model: string = "fedslm-model"): Promise<void> {
    console.log(`Pulling model ${model}...`);

    const { spawn } = require("child_process");

    return new Promise((resolve, reject) => {
      const process = spawn("ollama", ["pull", model]);

      process.stdout.on("data", (data) => {
        console.log(data.toString());
      });

      process.stderr.on("data", (data) => {
        console.error(data.toString());
      });

      process.on("close", (code) => {
        if (code === 0) {
          console.log(`✅ Model ${model} pulled successfully`);
          resolve();
        } else {
          reject(new Error(`Model pull failed with code ${code}`));
        }
      });
    });
  }
}
