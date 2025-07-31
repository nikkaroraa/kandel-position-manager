import { Low } from "lowdb";
import { JSONFile } from "lowdb/node";
import { join } from "path";

interface KandelDeployment {
  id: string;
  address: string;
  deployedBy: string;
  deployedAt: string;
  deploymentTx: string;
  deploymentId: string; // To track which anvil deployment this belongs to
  name?: string;
  market: {
    base: string;
    quote: string;
  };
  priceRange: {
    min: number;
    max: number;
  };
  pricePoints: number;
  stepSize: number;
  gasreq: number;
  totalBaseDeposited: string;
  totalQuoteDeposited: string;
  provision: string;
  active: boolean;
  source: "cli" | "ui"; // Track where it was created from
}

interface ContractDeployment {
  id: string;
  deployedAt: string;
  contracts: {
    mangrove: string;
    reader: string;
    kandelSeeder: string;
    weth: string;
    usdc: string;
  };
}

interface Database {
  kandels: KandelDeployment[];
  contractDeployments: ContractDeployment[];
  currentDeploymentId: string | null;
}

// Create database instance
const file = join(process.cwd(), "storage", "kandels.json");
const adapter = new JSONFile<Database>(file);
const db = new Low(adapter, {
  kandels: [],
  contractDeployments: [],
  currentDeploymentId: null,
});

async function read() {
  await db.read();
}

async function write() {
  await db.write();
}

// Contract deployment management
export async function saveContractDeployment(
  contracts: ContractDeployment["contracts"]
): Promise<string> {
  await read();

  const deployment: ContractDeployment = {
    id: Date.now().toString(),
    deployedAt: new Date().toISOString(),
    contracts,
  };

  db.data.contractDeployments.push(deployment);
  db.data.currentDeploymentId = deployment.id;

  await write();
  return deployment.id;
}

export async function getCurrentDeploymentId(): Promise<string | null> {
  await read();
  return db.data.currentDeploymentId;
}

export async function getCurrentContracts(): Promise<
  ContractDeployment["contracts"] | null
> {
  await read();
  const deploymentId = db.data.currentDeploymentId;
  if (!deploymentId) return null;

  const deployment = db.data.contractDeployments.find(
    (d) => d.id === deploymentId
  );
  return deployment?.contracts || null;
}

// Kandel management
export async function addKandel(
  kandel: Omit<KandelDeployment, "id" | "deploymentId">
): Promise<KandelDeployment> {
  await read();

  const deploymentId = db.data.currentDeploymentId;
  if (!deploymentId) {
    throw new Error("No active contract deployment found");
  }

  const newKandel: KandelDeployment = {
    ...kandel,
    id: Date.now().toString(),
    deploymentId,
  };

  db.data.kandels.push(newKandel);
  await write();

  return newKandel;
}

export async function getActiveKandels(): Promise<KandelDeployment[]> {
  await read();
  const deploymentId = db.data.currentDeploymentId;
  if (!deploymentId) return [];

  // Only return kandels from current deployment
  return db.data.kandels.filter((k) => k.deploymentId === deploymentId);
}

export async function getAllKandels(): Promise<KandelDeployment[]> {
  await read();
  return db.data.kandels;
}

export async function getKandelsByUser(
  userAddress: string
): Promise<KandelDeployment[]> {
  await read();
  const deploymentId = db.data.currentDeploymentId;
  if (!deploymentId) return [];

  return db.data.kandels.filter(
    (k) =>
      k.deploymentId === deploymentId &&
      k.deployedBy.toLowerCase() === userAddress.toLowerCase()
  );
}

export async function updateKandel(
  address: string,
  updates: Partial<KandelDeployment>
): Promise<void> {
  await read();

  const index = db.data.kandels.findIndex(
    (k) => k.address.toLowerCase() === address.toLowerCase()
  );

  if (index !== -1) {
    db.data.kandels[index] = {
      ...db.data.kandels[index],
      ...updates,
    };
    await write();
  }
}

export async function removeKandel(address: string): Promise<void> {
  await read();

  const index = db.data.kandels.findIndex(
    (k) => k.address.toLowerCase() === address.toLowerCase()
  );

  if (index !== -1) {
    db.data.kandels.splice(index, 1);
    await write();
  }
}

export async function clearCurrentDeployment(): Promise<void> {
  await read();
  db.data.currentDeploymentId = null;
  await write();
}

// Debug methods
export async function getStats() {
  await read();
  return {
    totalKandels: db.data.kandels.length,
    activeKandels: db.data.kandels.filter(
      (k) => k.deploymentId === db.data.currentDeploymentId
    ).length,
    totalDeployments: db.data.contractDeployments.length,
    currentDeploymentId: db.data.currentDeploymentId,
  };
}

export const kandelDB = {
  saveContractDeployment,
  getCurrentDeploymentId,
  getCurrentContracts,
  addKandel,
  getActiveKandels,
  getAllKandels,
  getKandelsByUser,
  updateKandel,
  removeKandel,
  clearCurrentDeployment,
  getStats,
};

export type { KandelDeployment, ContractDeployment };
