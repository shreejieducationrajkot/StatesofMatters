export enum ContainerType {
  CUBE = 'CUBE',
  CYLINDER = 'CYLINDER',
  SPHERE = 'SPHERE',
}

export enum MatterState {
  EMPTY = 'EMPTY',
  SOLID = 'SOLID',
  LIQUID = 'LIQUID',
  GAS = 'GAS',
}

export interface ContainerData {
  id: number;
  type: ContainerType;
  matter: MatterState;
  label: string;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
}

export interface SimState {
  waterLevels: number[]; // 0 to 1
  particles: Particle[][];
}