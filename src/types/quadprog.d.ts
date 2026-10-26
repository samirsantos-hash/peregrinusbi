declare module 'quadprog' {
  export function solveQP(d: number[][], v: number[], a: number[][], b: number[], meq?: number): { solution: number[]; message: string };
}